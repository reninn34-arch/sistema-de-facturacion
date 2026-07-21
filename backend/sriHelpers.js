const fs = require('fs');
const path = require('path');
const logger = require('./src/utils/logger');

// ============================================
// VALIDACIÓN BÁSICA DE XML ANTES DE FIRMAR
// ============================================
function validateXmlStructure(xml) {
  const errors = [];
  
  // Validar que tenga el elemento raíz
  if (!xml.match(/<(factura|notaCredito)/)) {
    errors.push('XML debe contener elemento factura o notaCredito');
  }
  
  // Validar campos obligatorios del infoTributaria
  const requiredFields = [
    'ambiente',
    'tipoEmision',
    'razonSocial',
    'nombreComercial',
    'ruc',
    'claveAcceso',
    'codDoc',
    'estab',
    'ptoEmi',
    'secuencial',
    'dirMatriz'
  ];
  
  requiredFields.forEach(field => {
    const regex = new RegExp(`<${field}>\\s*(.+?)\\s*<\\/${field}>`);
    const match = xml.match(regex);
    if (!match || !match[1] || match[1].trim() === '') {
      errors.push(`Campo obligatorio faltante o vacío: ${field}`);
    }
  });
  
  // Validar formato de RUC (13 dígitos)
  const rucMatch = xml.match(/<ruc>\s*(\d+)\s*<\/ruc>/);
  if (rucMatch && rucMatch[1].length !== 13) {
    errors.push('RUC debe tener exactamente 13 dígitos');
  }
  
  // Validar formato de clave de acceso (49 dígitos)
  const claveMatch = xml.match(/<claveAcceso>\s*(\d+)\s*<\/claveAcceso>/);
  if (claveMatch && claveMatch[1].length !== 49) {
    errors.push('Clave de acceso debe tener exactamente 49 dígitos');
  }
  
  // Validar que tenga al menos un detalle
  if (!xml.match(/<detalles>/)) {
    errors.push('XML debe contener elemento detalles');
  }
  
  // Validar totales
  const totalMatch = xml.match(/<importeTotal>\s*(.+?)\s*<\/importeTotal>/);
  if (totalMatch) {
    const total = parseFloat(totalMatch[1]);
    if (isNaN(total) || total <= 0) {
      errors.push('ImporteTotal debe ser un número mayor a 0');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================
// RETRY LOGIC CON BACKOFF EXPONENCIAL
// ============================================
async function retryWithBackoff(fn, maxRetries = 5, initialDelay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`🔄 Intento ${attempt}/${maxRetries}...`);
      const result = await fn();
      
      // Si llegamos aquí, fue exitoso
      if (attempt > 1) {
        logger.info(`✅ Exitoso después de ${attempt} intentos`);
      }
      return result;
      
    } catch (error) {
      lastError = error;
      logger.warn(`❌ Intento ${attempt} falló: ${error.message}`);
      
      // Si es el último intento, lanzar el error
      if (attempt === maxRetries) {
        logger.error(`🚫 Todos los ${maxRetries} intentos fallaron`);
        throw error;
      }
      
      // Calcular delay exponencial: 1s, 2s, 4s, 8s, 16s
      const delay = initialDelay * Math.pow(2, attempt - 1);
      logger.debug(`⏳ Esperando ${delay}ms antes del siguiente intento...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// ============================================
// SISTEMA DE BACKUP DE XMLs AUTORIZADOS
//
// Copia SECUNDARIA en disco. El registro fiscal principal es la base de datos:
// el XML autorizado se guarda en Document.authorizedXml.
//
// En serverless (Vercel) el filesystem es de solo lectura y efímero, así que
// esta copia no está disponible. Antes se intentaba escribir igualmente: fallaba,
// el try/catch se lo tragaba y getBackupInfo reportaba "0 respaldos", dando una
// falsa sensación de tener copias. Ahora se omite de forma explícita.
// ============================================
const isServerless = !!(process.env.VERCEL || process.env.NOW_BUILDER);
const BACKUP_DIR = path.join(__dirname, 'backups');

function ensureBackupDirectory() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    logger.info(`📁 Directorio de backups creado: ${BACKUP_DIR}`);
  }
}

function saveAuthorizedXml(claveAcceso, xmlAutorizado, numeroAutorizacion) {
  if (isServerless) {
    logger.debug(`Backup en disco omitido (entorno serverless). El XML autorizado queda en la base de datos. Clave: ${claveAcceso}`);
    return null;
  }
  try {
    ensureBackupDirectory();
    
    // Crear subcarpeta por año y mes (para organización)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const subDir = path.join(BACKUP_DIR, `${year}`, `${month}`);
    
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }
    
    // Nombre del archivo: claveAcceso_numeroAutorizacion.xml
    const filename = `${claveAcceso}_${numeroAutorizacion}.xml`;
    const filepath = path.join(subDir, filename);
    
    // Guardar XML
    fs.writeFileSync(filepath, xmlAutorizado, 'utf8');
    
    logger.info(`💾 XML autorizado guardado: ${filepath}`);
    
    // También crear metadata JSON
    const metadata = {
      claveAcceso,
      numeroAutorizacion,
      fechaBackup: now.toISOString(),
      fechaAutorizacion: now.toISOString(),
      filepath
    };
    
    const metadataFile = filepath.replace('.xml', '.json');
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2), 'utf8');
    
    return filepath;
    
  } catch (error) {
    logger.error('❌ Error al guardar backup:', error);
    // No lanzar error - el backup no debe bloquear el proceso
    return null;
  }
}

function getBackupInfo() {
  // No reportar "0 respaldos" en serverless: ahí el backup en disco no aplica y
  // ese cero se leería como "el sistema funciona pero no hay copias".
  if (isServerless) {
    return {
      available: false,
      reason: 'El respaldo en disco no está disponible en entorno serverless (filesystem de solo lectura y efímero). Los XML autorizados se conservan en la base de datos (Document.authorizedXml).',
      totalFiles: 0,
      totalSizeMB: '0.00',
      backupPath: null,
      years: {}
    };
  }

  try {
    ensureBackupDirectory();

    const stats = {
      available: true,
      totalFiles: 0,
      totalSize: 0,
      backupPath: BACKUP_DIR,
      years: {}
    };
    
    // Recorrer directorio de backups
    if (fs.existsSync(BACKUP_DIR)) {
      const years = fs.readdirSync(BACKUP_DIR).filter(f => {
        return fs.statSync(path.join(BACKUP_DIR, f)).isDirectory();
      });
      
      years.forEach(year => {
        stats.years[year] = { months: {}, total: 0 };
        
        const yearPath = path.join(BACKUP_DIR, year);
        const months = fs.readdirSync(yearPath).filter(f => {
          return fs.statSync(path.join(yearPath, f)).isDirectory();
        });
        
        months.forEach(month => {
          const monthPath = path.join(yearPath, month);
          const files = fs.readdirSync(monthPath).filter(f => f.endsWith('.xml'));
          
          stats.years[year].months[month] = files.length;
          stats.years[year].total += files.length;
          stats.totalFiles += files.length;
          
          // Calcular tamaño total
          files.forEach(file => {
            const filePath = path.join(monthPath, file);
            const fileStats = fs.statSync(filePath);
            stats.totalSize += fileStats.size;
          });
        });
      });
    }
    
    // Convertir tamaño a MB
    stats.totalSizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);
    
    return stats;
    
  } catch (error) {
    logger.error('❌ Error al obtener info de backups:', error);
    return null;
  }
}

// ============================================
// MONITOREO DE CERTIFICADO (Alerta 30 días)
// ============================================
function checkCertificateExpiration(certificate) {
  const now = new Date();
  const expirationDate = new Date(certificate.validity.notAfter);
  const daysUntilExpiration = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
  
  const status = {
    isValid: now >= certificate.validity.notBefore && now <= certificate.validity.notAfter,
    expirationDate: expirationDate.toLocaleDateString('es-EC'),
    daysUntilExpiration,
    shouldAlert: daysUntilExpiration <= 30 && daysUntilExpiration > 0,
    isExpired: daysUntilExpiration < 0,
    subject: certificate.subject.attributes.map(a => `${a.shortName}=${a.value}`).join(', ')
  };
  
  if (status.isExpired) {
    status.message = `⚠️ CERTIFICADO EXPIRADO desde hace ${Math.abs(daysUntilExpiration)} días`;
    status.severity = 'ERROR';
  } else if (status.shouldAlert) {
    status.message = `⚠️ ALERTA: El certificado expira en ${daysUntilExpiration} días`;
    status.severity = 'WARNING';
  } else {
    status.message = `✅ Certificado válido por ${daysUntilExpiration} días más`;
    status.severity = 'OK';
  }
  
  return status;
}

// ============================================
// VALIDACIÓN DE RESPUESTA SRI
// ============================================
function parseSriResponse(respuesta, tipo) {
  const result = {
    success: false,
    estado: null,
    mensajes: [],
    data: {}
  };
  
  try {
    if (tipo === 'recepcion') {
      result.estado = respuesta.estado;
      
      // Normalizar comprobantes
      let comprobantes = respuesta.comprobantes?.comprobante;
      if (!Array.isArray(comprobantes)) {
        comprobantes = comprobantes ? [comprobantes] : [];
      }
      
      // Extraer mensajes
      if (comprobantes.length > 0) {
        let mensajes = comprobantes[0].mensajes?.mensaje || [];
        if (!Array.isArray(mensajes)) {
          mensajes = mensajes ? [mensajes] : [];
        }
        
        result.mensajes = mensajes.map(m => ({
          identificador: m.identificador,
          mensaje: m.mensaje,
          tipo: m.tipo,
          informacionAdicional: m.informacionAdicional
        }));
      }
      
      result.success = result.estado === 'RECIBIDA';
      result.data = {
        claveAcceso: respuesta.claveAcceso || comprobantes[0]?.claveAcceso,
        comprobantes
      };
      
    } else if (tipo === 'autorizacion') {
      // Normalizar autorizaciones
      let autorizaciones = respuesta.autorizaciones?.autorizacion;
      if (!Array.isArray(autorizaciones)) {
        autorizaciones = autorizaciones ? [autorizaciones] : [];
      }
      
      if (autorizaciones.length > 0) {
        const autorizacion = autorizaciones[0];
        result.estado = autorizacion.estado;
        
        // Extraer mensajes
        let mensajes = autorizacion.mensajes?.mensaje || [];
        if (!Array.isArray(mensajes)) {
          mensajes = mensajes ? [mensajes] : [];
        }
        
        result.mensajes = mensajes.map(m => ({
          identificador: m.identificador,
          mensaje: m.mensaje,
          tipo: m.tipo,
          informacionAdicional: m.informacionAdicional
        }));
        
        result.success = result.estado === 'AUTORIZADO';
        result.data = {
          numeroAutorizacion: autorizacion.numeroAutorizacion,
          fechaAutorizacion: autorizacion.fechaAutorizacion,
          ambiente: autorizacion.ambiente,
          comprobante: autorizacion.comprobante
        };
      } else {
        result.estado = 'EN_PROCESAMIENTO';
        result.data.mensaje = 'El comprobante está siendo procesado';
      }
    }
    
  } catch (error) {
    logger.error('❌ Error al parsear respuesta SRI:', error);
    result.error = error.message;
  }
  
  return result;
}

module.exports = {
  validateXmlStructure,
  retryWithBackoff,
  saveAuthorizedXml,
  getBackupInfo,
  checkCertificateExpiration,
  parseSriResponse,
  BACKUP_DIR
};
