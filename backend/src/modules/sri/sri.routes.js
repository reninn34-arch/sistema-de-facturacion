const express = require('express');
const soap = require('soap');
const forge = require('node-forge');
const SignedXml = require('xml-crypto').SignedXml;
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const {
  validateXmlStructure,
  retryWithBackoff,
  saveAuthorizedXml,
  getBackupInfo,
  checkCertificateExpiration,
  parseSriResponse
} = require('../../../sriHelpers');
const logger = require('../../utils/logger');

const router = express.Router();

// =================================================================
// [ORIGINAL] MIDDLEWARES DE SEGURIDAD
// =================================================================

// [ORIGINAL] Middleware de autenticación (API Key)
const authenticate = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.API_KEY || process.env.VITE_API_KEY;
    if (!apiKey || !validApiKey || apiKey !== validApiKey) {
      return res.status(401).json({
        success: false,
        error: 'No autorizado - API Key inválida'
      });
    }
  }
  next();
};

// [ORIGINAL] MÓDULO SRI (CORE)
// =================================================================
// Lógica original de conexión con el SRI (Firma, Recepción, Autorización).
// =================================================================

const SRI_ENDPOINTS = {
  TEST: {
    RECEPCION: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    AUTORIZACION: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl'
  },
  PROD: {
    RECEPCION: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    AUTORIZACION: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl'
  }
};

// ============================================
// ENDPOINT: Firmar XML con certificado .p12
// ============================================
router.post('/api/sri/sign-xml', authenticate, async (req, res) => {
  try {
    let { xml, p12Base64, password, isProduction, businessId } = req.body;

    // Camino seguro: si la petición no trae el .p12, se carga CIFRADO desde el
    // certificado guardado del negocio y se descifra solo aquí, en memoria.
    // (El camino legacy —recibir p12Base64/password del cliente— sigue funcionando.)
    if (xml && (!p12Base64 || !password) && businessId) {
      try {
        const prisma = require('../../../prisma/client');
        const { decrypt } = require('../../utils/crypto');
        const biz = await prisma.business.findUnique({
          where: { id: businessId },
          select: { electronicSignature: true, sriPassword: true }
        });
        if (biz?.electronicSignature && biz?.sriPassword) {
          p12Base64 = decrypt(biz.electronicSignature);
          password = decrypt(biz.sriPassword);
          logger.info('🔐 Firmando con el certificado cifrado almacenado del negocio');
        }
      } catch (e) {
        logger.error('❌ No se pudo cargar el certificado almacenado:', e.message);
      }
    }

    if (!xml || !p12Base64 || !password) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros requeridos: xml y el certificado (.p12 en la petición o firma guardada del negocio)'
      });
    }

    logger.info('📝 Firmando XML con certificado digital...');

    // ============================================
    // VALIDACIÓN PREVIA DEL XML
    // ============================================
    logger.info('🔍 Validando estructura del XML...');
    const validation = validateXmlStructure(xml);

    if (!validation.valid) {
      logger.error('❌ Errores de validación:', { errors: validation.errors });
      return res.status(400).json({
        success: false,
        error: 'XML inválido',
        validationErrors: validation.errors
      });
    }

    logger.info('✅ XML validado correctamente');

    // Decodificar certificado .p12
    const p12Der = forge.util.decode64(p12Base64);
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    // Extraer certificado y clave privada
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

    if (!certBags[forge.pki.oids.certBag] || !keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]) {
      throw new Error('No se pudo extraer el certificado o clave privada del archivo .p12');
    }

    const certificate = certBags[forge.pki.oids.certBag][0].cert;
    const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;

    if (!certificate || !privateKey) {
      throw new Error('Certificado o clave privada inválidos');
    }

    // ============================================
    // VALIDACIÓN DE VIGENCIA DEL CERTIFICADO
    // ============================================
    const certStatus = checkCertificateExpiration(certificate);
    logger.info(certStatus.message);

    if (certStatus.isExpired) {
      // LÓGICA DE MODO: Producción vs Demo
      if (isProduction) {
        return res.status(400).json({
          success: false,
          error: `⛔ ERROR PRODUCCIÓN: ${certStatus.message}. Debe usar un certificado vigente para facturar legalmente.`,
          certificateInfo: certStatus
        });
      } else {
        logger.warn('⚠️ [SIMULACIÓN] Permitiendo certificado expirado en modo DEMO para pruebas.');
      }
    }

    // Alerta si está por vencer
    if (certStatus.shouldAlert) {
      logger.warn(`⚠️ ${certStatus.message}`);
    }

    // ============================================
    // CANONICALIZACIÓN C14N (XML Canonical 1.0)
    // ============================================
    // Parsear el XML para trabajar con el DOM
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'text/xml');

    // Verificar errores de parseo
    const parserErrors = xmlDoc.getElementsByTagName('parsererror');
    if (parserErrors.length > 0) {
      throw new Error('XML mal formado: ' + parserErrors[0].textContent);
    }

    // Obtener el elemento raíz (factura o notaCredito)
    const rootElement = xmlDoc.documentElement;
    if (!rootElement || (rootElement.nodeName !== 'factura' && rootElement.nodeName !== 'notaCredito')) {
      throw new Error('No se encontró elemento factura o notaCredito en el XML');
    }

    // CRÍTICO: Asegurar que el elemento raíz tenga id="comprobante"
    if (!rootElement.getAttribute('id')) {
      rootElement.setAttribute('id', 'comprobante');
      logger.debug('✓ Atributo id="comprobante" agregado al elemento raíz');
    }

    // Configuración de canonicalización C14N
    const c14nAlgorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';

    // Crear instancia de SignedXml con canonicalizationAlgorithm
    const sig = new SignedXml();
    sig.canonicalizationAlgorithm = c14nAlgorithm;

    // Canonicalizar el elemento raíz usando xml-crypto
    const elementToSign = sig.getCanonXml([c14nAlgorithm], rootElement);

    // Calcular digest SHA1 del elemento canonicalizado
    const md = forge.md.sha1.create();
    md.update(elementToSign, 'utf8');
    const digestValue = forge.util.encode64(md.digest().getBytes());

    logger.debug('🔐 Digest calculado:', digestValue.substring(0, 20) + '...');

    // ============================================
    // CALCULAR DIGEST DEL CERTIFICADO (XAdES-BES)
    // ============================================
    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes();
    const certBase64 = forge.util.encode64(certDer);

    const mdCert = forge.md.sha1.create();
    mdCert.update(certDer, 'raw');
    const certDigestValue = forge.util.encode64(mdCert.digest().getBytes());

    logger.debug('📜 Certificado digest:', certDigestValue.substring(0, 20) + '...');

    // ============================================
    // CONSTRUIR XAdES-BES COMPLETO
    // ============================================
    const signingTime = new Date().toISOString();

    // Formato correcto del IssuerName según RFC 2253
    // El SRI requiere que los atributos estén invertidos según RFC 2253
    // Log de debug para atributos
    logger.debug('📜 Atributos del Emisor (Raw):', JSON.stringify(certificate.issuer.attributes.map(a => ({
      name: a.name,
      type: a.type,
      value: a.value
    })), null, 2));

    // Función auxiliar para escapar caracteres especiales según RFC 2253
    const escapeAttributeValue = (value) => {
      // Caracteres que deben escaparse: , + " \ < > ; (y espacio al inicio/final)
      if (!value) return '';
      return value.replace(/([,+"\\<>;])/g, '\\$1')
        .replace(/^ /, '\\ ')
        .replace(/ $/, '\\ ');
    };

    // CORRECCIÓN: Usar .reverse() para cumplir con RFC 2253 que exige el SRI
    // Mapa de OIDs a nombres cortos estándar
    const oidMap = {
      '2.5.4.3': 'CN',
      '2.5.4.6': 'C',
      '2.5.4.7': 'L',
      '2.5.4.8': 'ST',
      '2.5.4.10': 'O',
      '2.5.4.11': 'OU',
      '2.5.4.97': 'organizationIdentifier', // Usar nombre completo para este OID si el SRI lo soporta
      '2.5.4.5': 'serialNumber',
      '2.5.4.4': 'SN',
      '2.5.4.42': 'GN'
    };

    // CRÍTICO: RFC 4514 format (no spaces after commas, specific OID format)
    const issuerName = certificate.issuer.attributes
      .slice() // Crear copia
      .reverse() // Invertir para RFC 4514
      .map(a => {
        // Para OID 2.5.4.97, usar formato "OID.2.5.4.97" según estándar
        let name;
        if (a.type === '2.5.4.97') {
          name = 'OID.2.5.4.97';
        } else {
          name = oidMap[a.type] || a.shortName || a.name || a.type;
        }
        const value = escapeAttributeValue(a.value);
        return `${name}=${value}`;
      })
      .join(','); // SIN espacios después de comas (RFC 4514)

    logger.debug('🔑 IssuerName generado (RFC 4514):', issuerName);

    // CORRECCIÓN CRÍTICA: Convertir el serial number de hexadecimal a decimal
    // El SRI exige formato decimal, pero node-forge lo devuelve en hexadecimal
    const serialNumberDecimal = BigInt('0x' + certificate.serialNumber).toString();
    logger.debug('🔢 Serial Number (decimal):', serialNumberDecimal);

    // SignedProperties (XAdES-BES)
    const signedPropertiesId = 'SignatureID-SignedProperties';
    const signedPropertiesXml = `<etsi:SignedProperties xmlns:etsi="http://uri.etsi.org/01903/v1.3.2#" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="${signedPropertiesId}"><etsi:SignedSignatureProperties><etsi:SigningTime>${signingTime}</etsi:SigningTime><etsi:SigningCertificate><etsi:Cert><etsi:CertDigest><ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/><ds:DigestValue>${certDigestValue}</ds:DigestValue></etsi:CertDigest><etsi:IssuerSerial><ds:X509IssuerName>${issuerName}</ds:X509IssuerName><ds:X509SerialNumber>${serialNumberDecimal}</ds:X509SerialNumber></etsi:IssuerSerial></etsi:Cert></etsi:SigningCertificate></etsi:SignedSignatureProperties></etsi:SignedProperties>`;

    // Parsear SignedProperties y canonicalizarlo
    const signedPropsDoc = parser.parseFromString(signedPropertiesXml, 'text/xml');
    const signedPropsElement = signedPropsDoc.documentElement;
    const canonicalSignedProps = sig.getCanonXml([c14nAlgorithm], signedPropsElement);

    // Calcular digest de SignedProperties canonicalizado
    const mdProps = forge.md.sha1.create();
    mdProps.update(canonicalSignedProps, 'utf8');
    const signedPropsDigest = forge.util.encode64(mdProps.digest().getBytes());

    logger.debug('📋 SignedProperties digest:', signedPropsDigest.substring(0, 20) + '...');

    // SignedInfo con DOS referencias: comprobante + SignedProperties
    const signedInfoXml = `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:etsi="http://uri.etsi.org/01903/v1.3.2#"><ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/><ds:Reference URI="#comprobante"><ds:Transforms><ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/><ds:Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/></ds:Transforms><ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/><ds:DigestValue>${digestValue}</ds:DigestValue></ds:Reference><ds:Reference Type="http://uri.etsi.org/01903#SignedProperties" URI="#${signedPropertiesId}"><ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/><ds:DigestValue>${signedPropsDigest}</ds:DigestValue></ds:Reference></ds:SignedInfo>`;

    // Parsear SignedInfo y canonicalizarlo para firmar
    const signedInfoDoc = parser.parseFromString(signedInfoXml, 'text/xml');
    const signedInfoElement = signedInfoDoc.documentElement;
    const canonicalSignedInfo = sig.getCanonXml([c14nAlgorithm], signedInfoElement);

    // Firmar SignedInfo canonicalizado con RSA-SHA1
    const mdSigned = forge.md.sha1.create();
    mdSigned.update(canonicalSignedInfo, 'utf8');
    const signature = privateKey.sign(mdSigned);
    const signatureValue = forge.util.encode64(signature);

    logger.debug('✍️ Firma generada:', signatureValue.substring(0, 20) + '...');

    // ============================================
    // ESTRUCTURA XAdES-BES COMPLETA
    // ============================================
    // IMPORTANTE: Usar las versiones ORIGINALES en el XML final
    // (Ya firmamos las versiones canonicalizadas, pero el SRI espera el formato original)
    const signatureBlock = `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:etsi="http://uri.etsi.org/01903/v1.3.2#" Id="Signature">
${signedInfoXml}
<ds:SignatureValue Id="SignatureValue">
${signatureValue}
</ds:SignatureValue>
<ds:KeyInfo Id="Certificate">
<ds:X509Data>
<ds:X509Certificate>
${certBase64}
</ds:X509Certificate>
</ds:X509Data>
</ds:KeyInfo>
<ds:Object Id="Signature-Object"><etsi:QualifyingProperties Target="#Signature">${signedPropertiesXml}</etsi:QualifyingProperties></ds:Object>
</ds:Signature>`;

    // Serializar el DOM actualizado (con id="comprobante" agregado)
    const { XMLSerializer } = require('@xmldom/xmldom');
    const serializer = new XMLSerializer();
    let xmlString = serializer.serializeToString(xmlDoc);

    // Asegurar declaración XML
    if (!xmlString.startsWith('<?xml')) {
      xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlString;
    }

    // Insertar firma en el XML actualizado
    const signedXml = xmlString.replace(/<\/(factura|notaCredito)>/, `${signatureBlock}</$1>`);

    logger.info('✅ XML firmado correctamente');

    res.json({
      success: true,
      signedXml,
      certificateInfo: {
        subject: certificate.subject.attributes.map(a => `${a.shortName}=${a.value}`).join(', '),
        issuer: certificate.issuer.attributes.map(a => `${a.shortName}=${a.value}`).join(', '),
        validFrom: certificate.validity.notBefore.toLocaleDateString(),
        validTo: certificate.validity.notAfter.toLocaleDateString(),
        serialNumber: certificate.serialNumber,
        daysUntilExpiration: certStatus.daysUntilExpiration,
        status: certStatus.severity
      }
    });

  } catch (error) {
    logger.error('❌ Error al firmar XML:', error);
    res.status(500).json({
      success: false,
      error: error.message.includes('Invalid password')
        ? 'Contraseña del certificado incorrecta'
        : `Error al firmar XML: ${error.message}`
    });
  }
});

// ============================================
// ENDPOINT: Enviar comprobante a Recepción SRI
// ============================================
router.post('/api/sri/recepcion', authenticate, async (req, res) => {
  try {
    const { xmlSigned, isProduction, isDemo } = req.body;

    if (!xmlSigned) {
      return res.status(400).json({
        success: false,
        error: 'Falta parámetro requerido: xmlSigned'
      });
    }

    // MODO DEMO: Simular respuesta sin conectar al SRI
    if (isDemo) {
      logger.info('🎮 MODO DEMO: Simulando respuesta de Recepción SRI');
      return res.json({
        success: true,
        estado: 'RECIBIDA',
        mensaje: 'Comprobante recibido exitosamente (MODO DEMO)',
        mostrarMensaje: true,
        isDemo: true
      });
    }

    const endpoint = isProduction
      ? SRI_ENDPOINTS.PROD.RECEPCION
      : SRI_ENDPOINTS.TEST.RECEPCION;

    logger.info(`📡 Conectando a Recepción SRI (${isProduction ? 'PRODUCCIÓN REAL' : 'SIMULACIÓN/PRUEBAS'})...`);
    logger.info(` Endpoint: ${endpoint}`);

    // ============================================
    // USAR RETRY LOGIC CON BACKOFF EXPONENCIAL
    // ============================================
    const result = await retryWithBackoff(async () => {
      // Crear cliente SOAP
      const client = await soap.createClientAsync(endpoint, {
        wsdl_options: {
          timeout: 30000,
          rejectUnauthorized: false
        }
      });

      // Codificar XML a Base64
      const xmlBase64 = Buffer.from(xmlSigned, 'utf-8').toString('base64');

      logger.info('📤 Enviando comprobante al SRI...');

      // Llamar método validarComprobante
      const soapResult = await client.validarComprobanteAsync({
        xml: xmlBase64
      });

      return soapResult;
    }, 3, 2000); // 3 reintentos, delay inicial 2 segundos

    const respuesta = result[0]?.RespuestaRecepcionComprobante;

    if (!respuesta) {
      throw new Error('Respuesta vacía del servicio de Recepción del SRI');
    }

    logger.debug('📦 Respuesta del SRI:', JSON.stringify(respuesta, null, 2));

    // Parsear respuesta usando helper
    const parsed = parseSriResponse(respuesta, 'recepcion');

    logger.info(`📋 Estado: ${parsed.estado}`);

    if (parsed.success) {
      logger.info('✅ Comprobante RECIBIDO por el SRI');
      res.json({
        success: true,
        estado: parsed.estado,
        claveAcceso: parsed.data.claveAcceso,
        mensaje: 'Comprobante recibido correctamente por el SRI',
        comprobantes: parsed.data.comprobantes
      });
    } else {
      logger.warn('⚠️ Comprobante rechazado:', parsed.mensajes);

      res.status(400).json({
        success: false,
        estado: parsed.estado,
        errores: parsed.mensajes,
        mensaje: parsed.mensajes[0]?.mensaje || 'El comprobante fue rechazado por el SRI'
      });
    }

  } catch (error) {
    logger.error('❌ Error en Recepción:', error);
    res.status(500).json({
      success: false,
      error: `Error al enviar a Recepción: ${error.message}`
    });
  }
});

// ============================================
// ENDPOINT: Consultar autorización en el SRI
// ============================================
router.post('/api/sri/autorizacion', authenticate, async (req, res) => {
  try {
    const { claveAcceso, isProduction, isDemo } = req.body;

    if (!claveAcceso) {
      return res.status(400).json({
        success: false,
        error: 'Falta parámetro requerido: claveAcceso'
      });
    }

    // MODO DEMO: Simular respuesta sin conectar al SRI
    if (isDemo) {
      logger.info('🎮 MODO DEMO: Simulando respuesta de Autorización SRI');
      return res.json({
        success: true,
        estado: 'AUTORIZADO',
        numeroAutorizacion: `${claveAcceso}${Date.now()}`,
        fechaAutorizacion: new Date().toISOString(),
        mensaje: 'Comprobante autorizado exitosamente (MODO DEMO)',
        isDemo: true
      });
    }

    const endpoint = isProduction
      ? SRI_ENDPOINTS.PROD.AUTORIZACION
      : SRI_ENDPOINTS.TEST.AUTORIZACION;

    logger.info(`🔍 Consultando autorización: ${claveAcceso.substring(0, 15)}... (${isProduction ? 'PRODUCCIÓN REAL' : 'SIMULACIÓN/PRUEBAS'})`);
    logger.info(`🔗 Endpoint: ${endpoint}`);

    // ============================================
    // USAR RETRY LOGIC PARA CONSULTAR AUTORIZACIÓN
    // ============================================
    const result = await retryWithBackoff(async () => {
      // Crear cliente SOAP
      const client = await soap.createClientAsync(endpoint, {
        wsdl_options: {
          timeout: 30000,
          rejectUnauthorized: false
        }
      });

      // Esperar un momento (el SRI necesita procesar)
      await new Promise(resolve => setTimeout(resolve, 2000));

      logger.info('📋 Consultando estado de autorización...');

      // Llamar método autorizacionComprobante
      const soapResult = await client.autorizacionComprobanteAsync({
        claveAccesoComprobante: claveAcceso
      });

      return soapResult;
    }, 5, 3000); // 5 reintentos, delay inicial 3 segundos

    logger.debug('📦 Respuesta Autorización:', JSON.stringify(result, null, 2));

    const respuesta = result[0]?.RespuestaAutorizacionComprobante;

    if (!respuesta) {
      logger.warn('⚠️ Sin respuesta de autorización');
      return res.json({
        success: false,
        estado: 'EN_PROCESAMIENTO',
        mensaje: 'El comprobante está siendo procesado por el SRI. Intente nuevamente en unos segundos.'
      });
    }

    // Parsear respuesta usando helper
    const parsed = parseSriResponse(respuesta, 'autorizacion');

    logger.info(`📋 Estado: ${parsed.estado}`);

    if (parsed.success) {
      logger.info('✅ Comprobante AUTORIZADO por el SRI');

      // ============================================
      // GUARDAR BACKUP DEL XML AUTORIZADO
      // ============================================
      if (parsed.data.comprobante && parsed.data.numeroAutorizacion) {
        const backupPath = saveAuthorizedXml(
          claveAcceso,
          parsed.data.comprobante,
          parsed.data.numeroAutorizacion
        );

        if (backupPath) {
          logger.info(`💾 Backup guardado en: ${backupPath}`);
        }
      }

      res.json({
        success: true,
        estado: parsed.estado,
        numeroAutorizacion: parsed.data.numeroAutorizacion,
        fechaAutorizacion: parsed.data.fechaAutorizacion,
        ambiente: parsed.data.ambiente,
        comprobante: parsed.data.comprobante,
        mensaje: 'Comprobante autorizado exitosamente por el SRI'
      });

    } else if (parsed.estado === 'NO AUTORIZADO') {
      logger.warn('❌ Comprobante NO AUTORIZADO:', parsed.mensajes);

      res.status(400).json({
        success: false,
        estado: parsed.estado,
        errores: parsed.mensajes,
        mensaje: 'El comprobante NO fue autorizado por el SRI'
      });

    } else if (parsed.estado === 'EN_PROCESAMIENTO') {
      res.json({
        success: false,
        estado: parsed.estado,
        mensaje: parsed.data.mensaje
      });

    } else {
      res.json({
        success: false,
        estado: parsed.estado,
        mensajes: parsed.mensajes,
        mensaje: 'Estado desconocido del comprobante'
      });
    }

  } catch (error) {
    logger.error('❌ Error en Autorización:', error);
    res.status(500).json({
      success: false,
      error: `Error al consultar autorización: ${error.message}`
    });
  }
});

router.get('/api/business/sri/status', async (req, res) => {
  res.json({ success: true, status: 'ONLINE', message: 'Servicio SRI de pruebas simulación disponible' });
});

// ============================================
// ENDPOINT: Reintentar comprobantes PENDING / No autorizados
// ============================================
router.post('/api/sri/retry-pending', authenticate, async (req, res) => {
  try {
    const businessId = req.user.businessId;
    if (!businessId) {
      return res.status(400).json({ success: false, error: 'Contexto de empresa no encontrado' });
    }

    const pendingDocs = await prisma.document.findMany({
      where: {
        businessId: businessId,
        status: 'PENDING',
        accessKey: { not: null }
      },
      take: 20
    });

    if (pendingDocs.length === 0) {
      return res.json({ success: true, count: 0, message: 'No hay comprobantes pendientes por reintentar', updatedDocuments: [] });
    }

    const updatedDocuments = [];
    for (const doc of pendingDocs) {
      if (!doc.accessKey) continue;
      try {
        const endpoint = req.body.isProduction ? SRI_ENDPOINTS.PROD.AUTORIZACION : SRI_ENDPOINTS.TEST.AUTORIZACION;
        const soapXml = buildAutorizacionSoapRequest(doc.accessKey);
        const soapRes = await callSoapService(endpoint, soapXml, 'autorizacionComprobante');

        if (soapRes.success) {
          const parsed = parseAutorizacionResponse(soapRes.data);
          if (parsed.success && parsed.estado === 'AUTORIZADO') {
            const updated = await prisma.document.update({
              where: { id: doc.id },
              data: {
                status: 'AUTHORIZED',
                accessKey: parsed.data.numeroAutorizacion || doc.accessKey,
                authorizedXml: parsed.data.comprobante || doc.authorizedXml
              }
            });
            updatedDocuments.push(updated);
          }
        }
      } catch (err) {
        logger.error(`❌ Error en reintento SRI de doc ${doc.id}:`, err.message);
      }
    }

    res.json({
      success: true,
      count: updatedDocuments.length,
      message: `Se reintentaron y actualizaron ${updatedDocuments.length} comprobantes a AUTORIZADO`,
      updatedDocuments
    });
  } catch (error) {
    logger.error('❌ Error en /api/sri/retry-pending:', error);
    res.status(500).json({ success: false, error: `Error reintentando pendientes: ${error.message}` });
  }
});

module.exports = router;
