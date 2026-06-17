const LEVELS = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
const currentLevel = LEVELS[process.env.LOG_LEVEL] !== undefined ? LEVELS[process.env.LOG_LEVEL] : LEVELS.INFO;

function serializeError(err) {
  if (!(err instanceof Error)) { return err; }
  return {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    ...(err.statusCode ? { statusCode: err.statusCode } : {}),
  };
}

function format(level, message, extra = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...extra,
  };

  if (extra.error) {
    entry.error = serializeError(extra.error);
  }

  return JSON.stringify(entry);
}

function shouldLog(level) {
  return LEVELS[level] !== undefined && LEVELS[level] <= currentLevel;
}

module.exports = {
  debug(message, extra = {}) {
    if (!shouldLog('DEBUG')) { return; }
    console.debug(format('DEBUG', message, extra));
  },

  info(message, extra = {}) {
    if (!shouldLog('INFO')) { return; }
    console.log(format('INFO', message, extra));
  },

  warn(message, extra = {}) {
    if (!shouldLog('WARN')) { return; }
    console.warn(format('WARN', message, extra));
  },

  error(message, extra = {}) {
    if (!shouldLog('ERROR')) { return; }
    console.error(format('ERROR', message, extra));
  },

  child(defaultExtra = {}) {
    const logger = this;
    return {
      debug: (msg, extra) => logger.debug(msg, { ...defaultExtra, ...extra }),
      info: (msg, extra) => logger.info(msg, { ...defaultExtra, ...extra }),
      warn: (msg, extra) => logger.warn(msg, { ...defaultExtra, ...extra }),
      error: (msg, extra) => logger.error(msg, { ...defaultExtra, ...extra }),
    };
  },
};
