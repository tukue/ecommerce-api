const metricsMiddleware = require('../middleware/metricsMiddleware');

jest.mock('../config/metrics', () => ({
  httpRequestDuration: { startTimer: jest.fn(() => jest.fn()) },
  httpRequestTotal: { inc: jest.fn() },
  inFlightRequests: { inc: jest.fn(), dec: jest.fn() },
  apiErrorTotal: { inc: jest.fn() },
}));

describe('metricsMiddleware', () => {
  let req, res, metrics;

  beforeEach(() => {
    jest.clearAllMocks();
    metrics = require('../config/metrics');
    req = {
      method: 'GET',
      path: '/api/products',
      route: { path: '/api/products' },
    };
    res = {
      statusCode: 200,
      on: jest.fn((event, cb) => {
        if (event === 'finish') cb();
      }),
    };
  });

  it('increments in-flight requests on entry', () => {
    const next = jest.fn();
    metricsMiddleware()(req, res, next);

    expect(metrics.inFlightRequests.inc).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('records duration and total on finish', () => {
    const next = jest.fn();
    metricsMiddleware()(req, res, next);

    expect(metrics.httpRequestDuration.startTimer).toHaveBeenCalled();
    expect(metrics.httpRequestTotal.inc).toHaveBeenCalledWith({
      method: 'GET',
      route: '/api/products',
      status_code: '200',
    });
  });

  it('decrements in-flight on finish', () => {
    const next = jest.fn();
    metricsMiddleware()(req, res, next);

    expect(metrics.inFlightRequests.dec).toHaveBeenCalledTimes(1);
  });

  it('records error for 4xx responses', () => {
    res.statusCode = 400;
    const next = jest.fn();
    metricsMiddleware()(req, res, next);

    expect(metrics.apiErrorTotal.inc).toHaveBeenCalledWith({
      route: '/api/products',
      method: 'GET',
      status_code: '400',
    });
  });

  it('records error for 5xx responses', () => {
    res.statusCode = 500;
    const next = jest.fn();
    metricsMiddleware()(req, res, next);

    expect(metrics.apiErrorTotal.inc).toHaveBeenCalledWith({
      route: '/api/products',
      method: 'GET',
      status_code: '500',
    });
  });

  it('does not record error for 2xx responses', () => {
    res.statusCode = 200;
    const next = jest.fn();
    metricsMiddleware()(req, res, next);

    expect(metrics.apiErrorTotal.inc).not.toHaveBeenCalled();
  });

  it('falls back to req.path when no route pattern is matched', () => {
    req.route = null;
    const next = jest.fn();
    metricsMiddleware()(req, res, next);

    expect(metrics.httpRequestTotal.inc).toHaveBeenCalledWith({
      method: 'GET',
      route: '/api/products',
      status_code: '200',
    });
  });
});
