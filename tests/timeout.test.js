const timeoutMiddleware = require('../middleware/timeout');

describe('timeoutMiddleware', () => {
  let req, res;

  beforeEach(() => {
    req = {
      correlationId: 'test-correlation-id',
      setTimeout: jest.fn(),
    };
    res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('calls next immediately', () => {
    const next = jest.fn();
    timeoutMiddleware()(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('sets timeout on the request', () => {
    const next = jest.fn();
    timeoutMiddleware(5000)(req, res, next);

    expect(req.setTimeout).toHaveBeenCalledWith(5000, expect.any(Function));
  });

  it('uses default timeout of 30000ms when not specified', () => {
    const next = jest.fn();
    timeoutMiddleware()(req, res, next);

    expect(req.setTimeout).toHaveBeenCalledWith(30000, expect.any(Function));
  });

  it('returns 503 with error json when timeout callback fires', () => {
    const next = jest.fn();
    timeoutMiddleware(100)(req, res, next);

    const timeoutCallback = req.setTimeout.mock.calls[0][1];
    timeoutCallback();

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: 'RequestTimeout',
      message: 'Request timed out',
      correlationId: 'test-correlation-id',
    });
  });

  it('does not send response if headers already sent', () => {
    res.headersSent = true;
    const next = jest.fn();
    timeoutMiddleware(100)(req, res, next);

    const timeoutCallback = req.setTimeout.mock.calls[0][1];
    timeoutCallback();

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
