const asyncHandler = require('../utils/asyncHandler');
const AuthService = require('../services/authService');

function service(req) {
  return new AuthService(req.models);
}

module.exports = {
  register: asyncHandler(async (req, res) => {
    const result = await service(req).register(req.body);
    res.status(201).json(result);
  }),

  login: asyncHandler(async (req, res) => {
    const result = await service(req).login(req.body);
    res.status(200).json(result);
  }),

  getProfile: asyncHandler(async (req, res) => {
    const user = await service(req).getProfile(req.user.id);
    res.status(200).json({ user });
  }),

  requestPasswordReset: asyncHandler(async (req, res) => {
    const result = await service(req).requestPasswordReset(req.body.email);
    res.status(200).json(result);
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const result = await service(req).resetPassword(req.body);
    res.status(200).json(result);
  }),
};
