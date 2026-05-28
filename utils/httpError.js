class HttpError extends Error {
  constructor(statusCode, message, name = 'HttpError') {
    super(message);
    this.status = statusCode;
    this.statusCode = statusCode;
    this.name = name;
  }
}

module.exports = HttpError;
