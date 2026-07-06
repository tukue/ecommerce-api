module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
};
