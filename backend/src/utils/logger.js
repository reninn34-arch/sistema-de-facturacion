const fs = require('fs');
const path = require('path');

// Asegurar que el directorio de logs existe
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const getTimestamp = () => new Date().toISOString();

const logToFile = (level, message) => {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filepath = path.join(logDir, `${date}.log`);
    const logEntry = `[${getTimestamp()}] [${level.toUpperCase()}] \n`;
    
    try {
        fs.appendFileSync(filepath, logEntry);
    } catch (e) {
        console.error("Error crítico escribiendo en log:", e);
    }
};

const logger = {
    info: (message, ...args) => {
        const formattedArgs = args.length ? args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') : '';
        const fullMessage = formattedArgs ? ` ` : message;
        
        console.log(`✅ [INFO] `, ...args);
        logToFile('info', fullMessage);
    },
    
    error: (message, error) => {
        const errorDetails = error ? (error.stack || error.message || JSON.stringify(error)) : '';
        const fullMessage = ` `;
        
        console.error(`❌ [ERROR] `, error || '');
        logToFile('error', fullMessage);
    },
    
    warn: (message, ...args) => {
        const formattedArgs = args.length ? args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') : '';
        const fullMessage = formattedArgs ? ` ` : message;

        console.warn(`⚠️ [WARN] `, ...args);
        logToFile('warn', fullMessage);
    },
    
    debug: (message, ...args) => {
        // Solo mostrar debug en desarrollo, pero guardar en archivo si se desea
        if (process.env.NODE_ENV !== 'production') {
            const formattedArgs = args.length ? args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') : '';
            const fullMessage = formattedArgs ? ` ` : message;
            
            console.debug(`🐛 [DEBUG] `, ...args);
            logToFile('debug', fullMessage);
        }
    }
};

module.exports = logger;
