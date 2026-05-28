function format(level, message, extra = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...extra,
  });
}

module.exports = {
  info(message, extra) {
    console.log(format('INFO', message, extra));
  },
  warn(message, extra) {
    console.warn(format('WARN', message, extra));
  },
  error(message, extra) {
    console.error(format('ERROR', message, extra));
  },
};
