const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const CURRENT_LEVEL = LOG_LEVELS[LOG_LEVEL] !== undefined ? LOG_LEVELS[LOG_LEVEL] : LOG_LEVELS.info;

function formatLog(level, message, meta = {}) {
  return JSON.stringify({
    level,
    timestamp: new Date().toISOString(),
    service: process.env.SERVICE_NAME || 'unknown',
    message,
    ...meta,
  });
}

const log = {
  error: (message, meta) => { if (CURRENT_LEVEL >= 0) console.error(formatLog('error', message, meta)); },
  warn: (message, meta) => { if (CURRENT_LEVEL >= 1) console.warn(formatLog('warn', message, meta)); },
  info: (message, meta) => { if (CURRENT_LEVEL >= 2) console.log(formatLog('info', message, meta)); },
  debug: (message, meta) => { if (CURRENT_LEVEL >= 3) console.log(formatLog('debug', message, meta)); },
};

module.exports = log;
