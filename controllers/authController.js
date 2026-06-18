const asyncHandler = require('../utils/asyncHandler');
const { getAuthService } = require('../config/container');

module.exports = {
  register: asyncHandler(async (req, res) => {
    const result = await getAuthService(req.models).register(req.body);
    res.status(201).json(result);
  }),

  login: asyncHandler(async (req, res) => {
    const result = await getAuthService(req.models).login(req.body);
    res.status(200).json(result);
  }),

  getProfile: asyncHandler(async (req, res) => {
    const user = await getAuthService(req.models).getProfile(req.user.id);
    res.status(200).json({ user });
  }),

  requestPasswordReset: asyncHandler(async (req, res) => {
    const result = await getAuthService(req.models).requestPasswordReset(req.body.email);
    res.status(200).json(result);
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const result = await getAuthService(req.models).resetPassword(req.body);
    res.status(200).json(result);
  }),
};
