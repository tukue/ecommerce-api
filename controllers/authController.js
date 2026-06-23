const asyncHandler = require('../utils/asyncHandler');
const { getAuthService } = require('../config/container');
const env = require('../config/env');

const setTokenCookies = (res, token, refreshToken) => {
  const cookieOpts = {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    path: '/',
  };

  res.cookie('token', token, {
    ...cookieOpts,
    maxAge: ms(env.jwtExpiresIn),
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOpts,
    maxAge: ms(env.jwtRefreshExpiresIn),
  });
};

const clearTokenCookies = (res) => {
  res.clearCookie('token', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
};

function ms(str) {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 3600000;
  }
  const n = parseInt(match[1], 10);
  switch (match[2]) {
    case 's':
      return n * 1000;
    case 'm':
      return n * 60000;
    case 'h':
      return n * 3600000;
    case 'd':
      return n * 86400000;
    default:
      return 3600000;
  }
}

module.exports = {
  register: asyncHandler(async (req, res) => {
    const result = await getAuthService(req.models).register(req.body);
    setTokenCookies(res, result.token, result.refreshToken);
    res.status(201).json({
      message: result.message,
      user: result.user,
    });
  }),

  login: asyncHandler(async (req, res) => {
    const result = await getAuthService(req.models).login(req.body);
    setTokenCookies(res, result.token, result.refreshToken);
    res.status(200).json({
      user: result.user,
    });
  }),

  logout: asyncHandler(async (req, res) => {
    clearTokenCookies(res);
    if (req.oidc && typeof req.oidc.logout === 'function') {
      await req.oidc.logout();
    }
    res.status(200).json({ message: 'Logged out successfully' });
  }),

  refresh: asyncHandler(async (req, res) => {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!rawToken) {
      return res.status(401).json({ message: 'Refresh token not provided' });
    }

    const authService = getAuthService(req.models);
    const decoded = authService.verifyRefreshToken(rawToken);
    const user = await authService.repository.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const token = authService.signToken(user);
    const refreshToken = authService.signRefreshToken(user);
    setTokenCookies(res, token, refreshToken);

    res.status(200).json({ message: 'Token refreshed successfully' });
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
