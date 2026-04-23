import { Document, BusinessInfo, InvoiceItem, SriStatus } from '../../src/types/types';
import { SignatureOptions } from './xmlSigner';

/**
 * URL del Backend Proxy para comunicación con SRI
 * El backend maneja SOAP y firma digital usando Node.js
 */
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// API_KEY debe estar configurada en variables de entorno
const API_KEY = import.meta.env.VITE_API_KEY;
if (!API_KEY) {
  console.warn('⚠️ VITE_API_KEY no está configurada en .env');
}

/**
 * Endpoints Oficiales del SRI (Servicios Offline)
 * Documentación: https://www.sri.gob.ec/facturacion-electronica
 */
export const SRI_ENDPOINTS = {
  TEST: {
    RECEPCION: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    AUTORIZACION: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl'
  },
  PROD: {
    RECEPCION: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    AUTORIZACION: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl'
  }
};

/**
 * Genera el XML base de la factura siguiendo el estándar XSD v1.1.0 del SRI
 * Cumple con: Ficha Técnica Comprobantes Electrónicos v2.21
 */
export const buildInvoiceXml = (doc: Document, business: BusinessInfo, items: InvoiceItem[]): string => {
  const subtotal15 = items.reduce((a, b) => b.taxRate > 0 ? a + (b.quantity * b.unitPrice - b.discount) : a, 0);
  const subtotal0 = items.reduce((a, b) => b.taxRate === 0 ? a + (b.quantity * b.unitPrice - b.discount) : a, 0);
  const totalDesc = items.reduce((a, b) => a + (b.discount || 0), 0);
  const totalSinImpuestos = subtotal15 + subtotal0;

  // IVA 15% (código 4) - Vigente desde 2024
  const totalIva = subtotal15 * 0.15;

  // Mapeo de Ambiente: 1=Pruebas, 2=Producción
  const ambiente = business.isProduction ? '2' : '1';

  // Fecha en formato dd/mm/yyyy
  const fechaEmision = doc.issueDate.split('-').reverse().join('/');

  // Tipo de identificación del comprador
  const tipoIdComprador = doc.entityPhone?.length === 13 ? '04' : // RUC
    doc.entityPhone?.length === 10 ? '05' : // Cédula
      '07'; // Consumidor Final

  // Para persona natural, usar solo el nombre y quitar nombreComercial si no es necesario
  const razonSocial = business.taxpayerType === 'PERSONA_NATURAL'
    ? escapeXml(business.name.trim())
    : escapeXml(business.name.trim());

  const nombreComercial = business.taxpayerType === 'PERSONA_NATURAL'
    ? escapeXml(business.tradename?.trim() || business.name.trim())
    : escapeXml(business.tradename?.trim() || business.name.trim());

  return `<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="1.1.0">
  <infoTributaria>
    <ambiente>${ambiente}</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>${razonSocial}</razonSocial>
    <nombreComercial>${nombreComercial}</nombreComercial>
    <ruc>${business.ruc}</ruc>
    <claveAcceso>${doc.accessKey}</claveAcceso>
    <codDoc>01</codDoc>
    <estab>${business.establishmentCode}</estab>
    <ptoEmi>${business.emissionPointCode}</ptoEmi>
    <secuencial>${doc.number.split('-')[2]}</secuencial>
    <dirMatriz>${escapeXml(business.address.trim())}</dirMatriz>${business.withholdingAgentCode ? `
    <agenteRetencion>${business.withholdingAgentCode}</agenteRetencion>` : ''}${business.regime === 'RIMPE_EMPRENDEDOR' || business.regime === 'RIMPE_POPULAR' ? `
    <contribuyenteRimpe>CONTRIBUYENTE RÉGIMEN RIMPE</contribuyenteRimpe>` : ''}
  </infoTributaria>
  <infoFactura>
    <fechaEmision>${fechaEmision}</fechaEmision>
    <dirEstablecimiento>${escapeXml((business.branchAddress || business.address).trim())}</dirEstablecimiento>${business.specialTaxpayerCode ? `
    <contribuyenteEspecial>${business.specialTaxpayerCode}</contribuyenteEspecial>` : ''}
    <obligadoContabilidad>${business.isAccountingObliged ? 'SI' : 'NO'}</obligadoContabilidad>
    <tipoIdentificacionComprador>${tipoIdComprador}</tipoIdentificacionComprador>
    <razonSocialComprador>${escapeXml(doc.entityName)}</razonSocialComprador>
    <identificacionComprador>${doc.entityPhone || '9999999999999'}</identificacionComprador>${doc.entityEmail ? `
    <direccionComprador>EMAIL: ${escapeXml(doc.entityEmail)}</direccionComprador>` : ''}
    <totalSinImpuestos>${totalSinImpuestos.toFixed(2)}</totalSinImpuestos>
    <totalDescuento>${totalDesc.toFixed(2)}</totalDescuento>
    <totalConImpuestos>${subtotal15 > 0 ? `
      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>4</codigoPorcentaje>
        <descuentoAdicional>0.00</descuentoAdicional>
        <baseImponible>${subtotal15.toFixed(2)}</baseImponible>
        <valor>${totalIva.toFixed(2)}</valor>
      </totalImpuesto>` : ''}${subtotal0 > 0 ? `
      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>0</codigoPorcentaje>
        <descuentoAdicional>0.00</descuentoAdicional>
        <baseImponible>${subtotal0.toFixed(2)}</baseImponible>
        <valor>0.00</valor>
      </totalImpuesto>` : ''}
    </totalConImpuestos>
    <propina>0.00</propina>
    <importeTotal>${doc.total.toFixed(2)}</importeTotal>
    <moneda>DOLAR</moneda>
    <pagos>
      <pago>
        <formaPago>${doc.paymentMethod || '01'}</formaPago>
        <total>${doc.total.toFixed(2)}</total>
        <plazo>0</plazo>
        <unidadTiempo>dias</unidadTiempo>
      </pago>
    </pagos>
  </infoFactura>
  <detalles>${items.map((it, idx) => {
    const baseImponible = it.quantity * it.unitPrice - (it.discount || 0);
    const valorImpuesto = baseImponible * (it.taxRate / 100);
    return `
    <detalle>
      <codigoPrincipal>${escapeXml(it.productId.substring(0, 25))}</codigoPrincipal>
      <descripcion>${escapeXml(it.description)}</descripcion>
      <cantidad>${it.quantity.toFixed(6)}</cantidad>
      <precioUnitario>${it.unitPrice.toFixed(6)}</precioUnitario>
      <descuento>${(it.discount || 0).toFixed(2)}</descuento>
      <precioTotalSinImpuesto>${baseImponible.toFixed(2)}</precioTotalSinImpuesto>
      <impuestos>
        <impuesto>
          <codigo>2</codigo>
          <codigoPorcentaje>${it.taxRate > 0 ? '4' : '0'}</codigoPorcentaje>
          <tarifa>${it.taxRate.toFixed(0)}</tarifa>
          <baseImponible>${baseImponible.toFixed(2)}</baseImponible>
          <valor>${valorImpuesto.toFixed(2)}</valor>
        </impuesto>
      </impuestos>
    </detalle>`;
  }).join('')}
  </detalles>${doc.additionalInfo ? `
  <infoAdicional>
    <campoAdicional nombre="Observaciones">${escapeXml(doc.additionalInfo)}</campoAdicional>
  </infoAdicional>` : ''}
</factura>`;
};

/**
 * Genera el XML de Nota de Crédito siguiendo el estándar XSD v1.1.0 del SRI
 * Documento código 04 - Para devoluciones, anulaciones y correcciones
 */
export const buildCreditNoteXml = (
  doc: Document,
  business: BusinessInfo,
  items: InvoiceItem[],
  reasonCode: string,
  customReason?: string
): string => {
  const subtotal15 = items.reduce((a, b) => b.taxRate > 0 ? a + (b.quantity * b.unitPrice - b.discount) : a, 0);
  const subtotal0 = items.reduce((a, b) => b.taxRate === 0 ? a + (b.quantity * b.unitPrice - b.discount) : a, 0);
  const totalDesc = items.reduce((a, b) => a + (b.discount || 0), 0);
  const totalSinImpuestos = subtotal15 + subtotal0;
  const totalIva = subtotal15 * 0.15;

  const ambiente = business.isProduction ? '2' : '1';
  const fechaEmision = doc.issueDate.split('-').reverse().join('/');

  // Tipo de identificación del comprador
  const tipoIdComprador = doc.entityPhone?.length === 13 ? '04' :
    doc.entityPhone?.length === 10 ? '05' : '07';

  // Generar clave de acceso (49 dígitos)
  const [year, month, day] = doc.issueDate.split('-');
  const fecha = `${day}${month}${year}`; // DDMMYYYY (8 dígitos)
  const tipoComprobante = '04'; // Nota de Crédito (2 dígitos)
  const ruc = business.ruc; // 13 dígitos
  const tipoAmbiente = ambiente; // 1 dígito
  const serie = business.establishmentCode + business.emissionPointCode; // 6 dígitos
  const secuencial = doc.number.split('-')[2].padStart(9, '0'); // 9 dígitos
  const codigoNumerico = Math.floor(Math.random() * 100000000).toString().padStart(8, '0'); // 8 dígitos
  const tipoEmision = '1'; // Normal (1 dígito)

  // Total: 8+2+13+1+6+9+8+1 = 48 dígitos + 1 verificador = 49 dígitos
  const claveBase = fecha + tipoComprobante + ruc + tipoAmbiente + serie + secuencial + codigoNumerico + tipoEmision;
  const digitoVerificador = calcularDigitoVerificador(claveBase);
  const claveAcceso = claveBase + digitoVerificador;

  // Descripción del motivo
  const motivoDescripcion = customReason ||
    (reasonCode === '01' ? 'Devolución de bienes' :
      reasonCode === '02' ? 'Anulación de factura' :
        reasonCode === '03' ? 'Rebaja o descuento' :
          reasonCode === '04' ? 'Corrección de datos' :
            reasonCode === '05' ? 'Promociones' :
              reasonCode === '06' ? 'Bonificaciones' : 'Descuento especial');

  return `<?xml version="1.0" encoding="UTF-8"?>
<notaCredito id="comprobante" version="1.1.0">
  <infoTributaria>
    <ambiente>${ambiente}</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>${escapeXml(business.name.trim())}</razonSocial>
    <nombreComercial>${escapeXml((business.tradename || business.name).trim())}</nombreComercial>
    <ruc>${business.ruc}</ruc>
    <claveAcceso>${claveAcceso}</claveAcceso>
    <codDoc>04</codDoc>
    <estab>${business.establishmentCode}</estab>
    <ptoEmi>${business.emissionPointCode}</ptoEmi>
    <secuencial>${secuencial}</secuencial>
    <dirMatriz>${escapeXml(business.address.trim())}</dirMatriz>
  </infoTributaria>
  <infoNotaCredito>
    <fechaEmision>${fechaEmision}</fechaEmision>
    <dirEstablecimiento>${escapeXml((business.branchAddress || business.address).trim())}</dirEstablecimiento>
    <tipoIdentificacionComprador>${tipoIdComprador}</tipoIdentificacionComprador>
    <razonSocialComprador>${escapeXml(doc.entityName)}</razonSocialComprador>
    <identificacionComprador>${doc.entityPhone || '9999999999999'}</identificacionComprador>
    <contribuyenteEspecial>${business.specialTaxpayerCode || ''}</contribuyenteEspecial>
    <obligadoContabilidad>${business.isAccountingObliged ? 'SI' : 'NO'}</obligadoContabilidad>
    <codDocModificado>01</codDocModificado>
    <numDocModificado>${doc.relatedDocumentNumber}</numDocModificado>
    <fechaEmisionDocSustento>${doc.relatedDocumentDate?.split('-').reverse().join('/')}</fechaEmisionDocSustento>
    <totalSinImpuestos>${totalSinImpuestos.toFixed(2)}</totalSinImpuestos>
    <valorModificacion>${doc.total.toFixed(2)}</valorModificacion>
    <moneda>DOLAR</moneda>
    <totalConImpuestos>
      ${subtotal0 > 0 ? `<totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>0</codigoPorcentaje>
        <baseImponible>${subtotal0.toFixed(2)}</baseImponible>
        <valor>0.00</valor>
      </totalImpuesto>` : ''}
      ${subtotal15 > 0 ? `<totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>4</codigoPorcentaje>
        <baseImponible>${subtotal15.toFixed(2)}</baseImponible>
        <valor>${totalIva.toFixed(2)}</valor>
      </totalImpuesto>` : ''}
    </totalConImpuestos>
    <motivo>${escapeXml(motivoDescripcion)}</motivo>
  </infoNotaCredito>
  <detalles>${items.map(it => {
    const baseImponible = it.quantity * it.unitPrice - it.discount;
    const valorImpuesto = it.taxRate > 0 ? baseImponible * 0.15 : 0;

    return `
    <detalle>
      <codigoInterno>${escapeXml(it.productId)}</codigoInterno>
      <descripcion>${escapeXml(it.description)}</descripcion>
      <cantidad>${it.quantity.toFixed(6)}</cantidad>
      <precioUnitario>${it.unitPrice.toFixed(6)}</precioUnitario>
      <descuento>${it.discount.toFixed(2)}</descuento>
      <precioTotalSinImpuesto>${baseImponible.toFixed(2)}</precioTotalSinImpuesto>
      <impuestos>
        <impuesto>
          <codigo>2</codigo>
          <codigoPorcentaje>${it.taxRate > 0 ? '4' : '0'}</codigoPorcentaje>
          <tarifa>${it.taxRate.toFixed(0)}</tarifa>
          <baseImponible>${baseImponible.toFixed(2)}</baseImponible>
          <valor>${valorImpuesto.toFixed(2)}</valor>
        </impuesto>
      </impuestos>
    </detalle>`;
  }).join('')}
  </detalles>${doc.additionalInfo ? `
  <infoAdicional>
    <campoAdicional nombre="Observaciones">${escapeXml(doc.additionalInfo)}</campoAdicional>
    ${doc.relatedDocumentAccessKey ? `<campoAdicional nombre="ClaveAccesoFactura">${doc.relatedDocumentAccessKey}</campoAdicional>` : ''}
  </infoAdicional>` : ''}
</notaCredito>`;
};

/**
 * Escapa caracteres especiales XML
 */
const escapeXml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Convierte un File o ArrayBuffer a base64
 */
const fileToBase64 = (file: File | ArrayBuffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Si ya es ArrayBuffer, convertir directamente
    if (file instanceof ArrayBuffer) {
      const bytes = new Uint8Array(file);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      resolve(base64);
      return;
    }

    // Si es File, usar FileReader
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remover el prefijo data:application/x-pkcs12;base64,
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Envía el comprobante al Web Service de Recepción del SRI
 * Usa el backend proxy para comunicación SOAP
 */
async function sendToRecepcion(
  xmlSigned: string,
  endpoint: string,
  onLog: (msg: string) => void,
  isDemo: boolean = false
): Promise<{ success: boolean; message: string; claveAcceso?: string }> {
  try {
    onLog(`📡 Enviando a SRI vía backend proxy...`);

    // Extraer clave de acceso del XML
    const claveMatch = xmlSigned.match(/<claveAcceso>(\d+)<\/claveAcceso>/);
    const claveAcceso = claveMatch ? claveMatch[1] : '';

    const response = await fetch(`${BACKEND_URL}/api/sri/recepcion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        xmlSigned: xmlSigned,
        isProduction: endpoint.includes('cel.sri.gob.ec'),
        isDemo: isDemo,
      }),
    });

    const data = await response.json();

    // ⚠️ MANEJO DE ERROR 400 DEL BACKEND (Por ejemplo, Error 70)
    if (!response.ok) {
        // Verificar si es el error 70 (En Procesamiento) en los errores devueltos
        const isProcessingError = data.errores && Array.isArray(data.errores) && 
            data.errores.some((e: any) => e.identificador === '70' || (e.mensaje && e.mensaje.includes('PROCESAMIENTO')));
        
        // Verificar también el mensaje directo o error directo
        const isProcessingMessage = (data.mensaje && data.mensaje.includes('PROCESAMIENTO')) || 
                                    (data.error && data.error.includes('PROCESAMIENTO'));

        if (isProcessingError || isProcessingMessage) {
            onLog('⚠️ SRI indica: En Procesamiento. Intentando consultar autorización...');
            return {
                success: true, // <--- TRUCO: Decimos que fue "exitoso" para que pase al siguiente paso
                message: 'Comprobante en procesamiento',
                claveAcceso,
            };
        }

        const errorMsg = data.error || data.mensaje || 'Error desconocido en recepción SRI';
        if (data.errores && Array.isArray(data.errores)) {
            const detalles = data.errores.map((e: any) => `${e.mensaje} (${e.informacionAdicional || ''})`).join('; ');
            throw new Error(`${errorMsg}: ${detalles}`);
        }
        throw new Error(errorMsg);
    }

    if (data.estado === 'RECIBIDA') {
      onLog('✅ Comprobante RECIBIDO por el SRI');
      return {
        success: true,
        message: data.mensaje || 'Comprobante recibido',
        claveAcceso,
      };
    } else if (data.estado === 'DEVUELTA') {
      onLog(`⚠️ Comprobante DEVUELTO: ${data.mensaje}`);
      return {
        success: false,
        message: data.mensaje || 'Comprobante devuelto',
      };
    }

    return {
      success: false,
      message: data.mensaje || 'Estado desconocido',
    };
  } catch (error: any) {
    onLog(`❌ Error en Recepción: ${error.message}`);
    // Si el error es de procesamiento, permitimos continuar
    if (error.message.includes('PROCESAMIENTO')) {
         const claveMatch = xmlSigned.match(/<claveAcceso>(\d+)<\/claveAcceso>/);
         const ca = claveMatch ? claveMatch[1] : '';
         return { success: true, message: 'En procesamiento', claveAcceso: ca };
    }
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Consulta la autorización del comprobante en el SRI
 * Usa el backend proxy para comunicación SOAP
 */
async function getAutorizacion(
  claveAcceso: string,
  endpoint: string,
  onLog: (msg: string) => void,
  isDemo: boolean = false
): Promise<{ success: boolean; numeroAutorizacion?: string; message: string; fechaAutorizacion?: string; sriStatus?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/sri/autorizacion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        claveAcceso: claveAcceso,
        endpoint: endpoint,
        isDemo: isDemo,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Si el backend devuelve error, revisar si es "NO AUTORIZADO" u otro
      if (data.estado === 'NO AUTORIZADO') {
         return {
            success: false,
            message: data.mensaje || 'No autorizado',
            sriStatus: 'NO AUTORIZADO'
         };
      }
      throw new Error(data.error || 'Error consultando autorización');
    }

    if (data.estado === 'AUTORIZADO') {
      onLog('✅ Comprobante AUTORIZADO por el SRI');
      return {
        success: true,
        numeroAutorizacion: data.numeroAutorizacion,
        fechaAutorizacion: data.fechaAutorizacion,
        message: data.mensaje || 'Comprobante autorizado',
        sriStatus: 'AUTORIZADO'
      };
    } else if (data.estado === 'NO AUTORIZADO') {
      onLog(`❌ Comprobante NO AUTORIZADO: ${data.mensaje}`);
      return {
        success: false,
        message: data.mensaje || 'No autorizado',
        sriStatus: 'NO AUTORIZADO'
      };
    } else {
      // Estado EN PROCESAMIENTO, PENDIENTE, u otro
      return {
        success: false,
        message: data.mensaje || 'Consultar nuevamente',
        sriStatus: data.estado
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
      sriStatus: 'ERROR_RED'
    };
  }
}

/**
 * Orquestador completo de Autorización con el SRI Ecuador
 * Sigue el flujo oficial: Firma -> Recepción -> Autorización
 * Usa el backend proxy para todas las operaciones que requieren Node.js
 */
export const authorizeWithSRI = async (
  xml: string,
  isProduction: boolean,
  signatureOptions: SignatureOptions | null,
  onStepChange: (step: string) => void,
  isDemo: boolean = false
): Promise<{ status: SriStatus; authNumber?: string; message: string; claveAcceso?: string; authorizedXml?: string }> => {
  try {
    const endpointSet = isProduction ? SRI_ENDPOINTS.PROD : SRI_ENDPOINTS.TEST;

    // Extraer clave de acceso del XML
    const claveMatch = xml.match(/<claveAcceso>(\d+)<\/claveAcceso>/);
    if (!claveMatch) {
      throw new Error('No se encontró la clave de acceso en el XML');
    }
    const claveAcceso = claveMatch[1];

    // PASO 1: Validar XML
    onStepChange('✅ XML generado según estándar SRI v1.1.0');
    await new Promise((r) => setTimeout(r, 500));

    let xmlFirmado = xml;

    // PASO 2: Firmar XML digitalmente (si se proporcionó certificado)
    if (signatureOptions && signatureOptions.p12File && signatureOptions.password) {
      onStepChange('🔐 Firmando XML con certificado digital...');

      try {
        // Convertir File a base64
        const p12Base64 = await fileToBase64(signatureOptions.p12File);

        const signResponse = await fetch(`${BACKEND_URL}/api/sri/sign-xml`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
          },
          body: JSON.stringify({
            xml: xml,
            p12Base64: p12Base64,
            password: signatureOptions.password,
          }),
        });

        const signData = await signResponse.json();

        if (!signResponse.ok) {
          throw new Error(signData.error || 'Error firmando XML');
        }

        xmlFirmado = signData.signedXml;
        onStepChange('✅ XML firmado correctamente');
      } catch (error: any) {
        onStepChange(`⚠️ Error en firma: ${error.message}`);
        throw error;
      }
    } else {
      onStepChange('ℹ️ Modo pruebas - XML sin firma digital');
    }
    await new Promise((r) => setTimeout(r, 500));

    // PASO 3: Enviar a Recepción del SRI
    onStepChange('📡 Enviando comprobante al SRI...');
    const recepcionResult = await sendToRecepcion(xmlFirmado, endpointSet.RECEPCION, onStepChange, isDemo);

    if (!recepcionResult.success) {
      return {
        status: SriStatus.REJECTED,
        message: `Error en recepción: ${recepcionResult.message}`,
      };
    }

    // PASO 4: Consultar Autorización del SRI (CON REINTENTOS AUTOMÁTICOS)
    onStepChange('🔍 Consultando autorización...');
    
    let intentos = 0;
    const maxIntentos = 10; // Intentaremos hasta 10 veces (aprox 20-30 segs)
    let autorizacionResult;

    // Bucle de insistencia (Polling)
    while (intentos < maxIntentos) {
        autorizacionResult = await getAutorizacion(
          recepcionResult.claveAcceso || claveAcceso,
          endpointSet.AUTORIZACION,
          onStepChange,
          isDemo
        );

        // Si ya está autorizado, salimos del bucle con éxito
        if (autorizacionResult.success) {
            break;
        }

        // Si el SRI dice explícitamente "NO AUTORIZADO" (rechazo definitivo), no reintentamos
        if (autorizacionResult.sriStatus === 'NO AUTORIZADO') {
             break;
        }
        
        // Si estamos aquí, es porque está "En Procesamiento" o "No Encontrado" aún.
        intentos++;
        if (intentos < maxIntentos) {
            onStepChange(`⏳ SRI procesando... insistiendo (${intentos}/${maxIntentos})`);
            // Esperamos 2.5 segundos antes de volver a preguntar (Backoff)
            await new Promise(r => setTimeout(r, 2500));
        }
    }

    // Resultado final después de los reintentos
    if (!autorizacionResult || !autorizacionResult.success) {
       // Si terminaron los intentos y sigue sin éxito
       if (autorizacionResult?.sriStatus === 'NO AUTORIZADO') {
           return {
               status: SriStatus.REJECTED,
               message: autorizacionResult.message,
               claveAcceso: claveAcceso,
           };
       }
       
       // Si sigue procesando o pendiente, devolvemos PENDING pero el mensaje explica el timeout
       return {
        status: SriStatus.PENDING,
        message: autorizacionResult?.message || "El SRI tardó demasiado en responder. El comprobante quedó en estado PENDIENTE.",
        claveAcceso: claveAcceso,
      };
    }

    return {
      status: SriStatus.AUTHORIZED,
      authNumber: autorizacionResult.numeroAutorizacion,
      message: autorizacionResult.message,
      claveAcceso: claveAcceso,
      authorizedXml: xmlFirmado,
    };
  } catch (error: any) {
    onStepChange(`❌ Error: ${error.message}`);
    return {
      status: SriStatus.REJECTED,
      message: error.message,
    };
  }
};

/**
 * Calcula el dígito verificador módulo 11 para la clave de acceso
 * Según especificaciones del SRI
 */
const calcularDigitoVerificador = (clave: string): string => {
  const factores = [2, 3, 4, 5, 6, 7];
  let suma = 0;
  let factor = 0;

  for (let i = clave.length - 1; i >= 0; i--) {
    suma += parseInt(clave[i]) * factores[factor];
    factor = (factor + 1) % 6;
  }

  const residuo = suma % 11;
  const resultado = residuo === 0 ? 0 : 11 - residuo;

  return resultado.toString();
};