const fs = require('fs');
const path = require('path');

const isVercel = process.env.VERCEL || process.env.NOW_BUILDER;

// Asegurar que el directorio de logs existe (solo fuera de Vercel)
const logDir = path.join(__dirname, '../logs');
if (!isVercel) {
    try {
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    } catch (e) {
        console.warn("No se pudo crear el directorio de logs locales:", e.message);
    }
}

const getTimestamp = () => new Date().toISOString();

// Une el mensaje con sus argumentos extra (objetos como JSON) en una sola línea.
const formatMessage = (message, args) => {
    const extra = args && args.length
        ? ' ' + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')
        : '';
    return `${message}${extra}`;
};

const logToFile = (level, message) => {
    if (isVercel) return; // En Vercel el FS es de solo lectura; los logs van a stdout.
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filepath = path.join(logDir, `${date}.log`);
    const logEntry = `[${getTimestamp()}] [${level.toUpperCase()}] ${message}\n`;

    try {
        fs.appendFileSync(filepath, logEntry);
    } catch (e) {
        console.error("Error crítico escribiendo en log:", e);
    }
};

const logger = {
    info: (message, ...args) => {
        console.log(`✅ [INFO] ${message}`, ...args);
        logToFile('info', formatMessage(message, args));
    },

    error: (message, error) => {
        const errorDetails = error ? (error.stack || error.message || JSON.stringify(error)) : '';
        console.error(`❌ [ERROR] ${message}`, error || '');
        logToFile('error', `${message}${errorDetails ? ' ' + errorDetails : ''}`);
    },

    warn: (message, ...args) => {
        console.warn(`⚠️ [WARN] ${message}`, ...args);
        logToFile('warn', formatMessage(message, args));
    },

    debug: (message, ...args) => {
        // Solo mostrar debug fuera de producción.
        if (process.env.NODE_ENV !== 'production') {
            console.debug(`🐛 [DEBUG] ${message}`, ...args);
            logToFile('debug', formatMessage(message, args));
        }
    }
};

module.exports = logger;
