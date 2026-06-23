const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const HttpError = require('../utils/httpError');
const AuthRepository = require('../repositories/authRepository');
const env = require('../config/env');

const MIN_JWT_SECRET_LENGTH = 32;
const PASSWORD_REQUIREMENTS_MESSAGE =
  'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.';

const isStrongPassword = (password) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);

class AuthService {
  constructor(models) {
    this.models = models;
    this.repository = new AuthRepository(models);
  }

  async findByAuthSubject(authSubject) {
    return this.repository.findByAuthSubject(authSubject);
  }

  async findByEmail(email) {
    return this.repository.findByEmail(email);
  }

  async provisionUserFromOidc(oidcUser) {
    return this.provisionExternalUser(oidcUser);
  }

  async provisionUserFromToken(decodedToken) {
    return this.provisionExternalUser(decodedToken);
  }

  async provisionExternalUser(profile) {
    if (!profile) {
      return null;
    }

    const authSubject = profile.sub;
    const email = profile.email;
    let user = null;

    if (authSubject) {
      user = await this.repository.findByAuthSubject(authSubject);
    }
    if (user) {
      return user;
    }

    if (!email) {
      return null;
    }

    user = await this.repository.findByEmail(email);
    if (user) {
      if (profile.email_verified !== true) {
        throw new HttpError(
          403,
          'A verified provider email is required to link an existing account',
          'UnverifiedEmailError',
        );
      }
      if (!user.authSubject && authSubject) {
        await this.repository.linkAuthSubject(user.id, authSubject);
        user.authSubject = authSubject;
      }
      return user;
    }

    if (profile.email_verified !== true) {
      throw new HttpError(
        403,
        'A verified provider email is required to create an account',
        'UnverifiedEmailError',
      );
    }

    const usernameBase = profile.name
      ? profile.name.replace(/\s+/g, '_').toLowerCase()
      : email.split('@')[0];
    const username = await this.generateExternalUsername(usernameBase);
    const randomPassword = crypto.randomBytes(24).toString('hex');

    return this.repository.createUser({ username, email, password: randomPassword, authSubject });
  }

  async generateExternalUsername(usernameBase) {
    const normalized =
      usernameBase
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 30) || 'user';

    let username = normalized;
    let suffix = 1;

    while (await this.repository.findByUsername(username)) {
      const suffixText = `_${suffix}`;
      username = `${normalized.slice(0, 30 - suffixText.length)}${suffixText}`;
      suffix += 1;
    }

    return username;
  }

  async register(input) {
    const { username, email, password } = input;

    const existingUser = await this.repository.findByEmailOrUsername(email, username);
    if (existingUser) {
      throw new HttpError(
        400,
        'User with this email or username already exists',
        'ValidationError',
      );
    }

    this.assertStrongPassword(password);

    const user = await this.repository.createUser({ username, email, password });

    return {
      message: 'Registration successful! Welcome to our platform.',
      user: this.sanitizeUser(user),
      token: this.signToken(user),
      refreshToken: this.signRefreshToken(user),
    };
  }

  async login(input) {
    const { email, password } = input;
    const user = await this.repository.findByEmail(email);

    if (!user || !(await user.validatePassword(password))) {
      throw new HttpError(
        401,
        'Invalid email or password. Please try again.',
        'AuthenticationError',
      );
    }

    return {
      user: this.sanitizeUser(user),
      token: this.signToken(user),
      refreshToken: this.signRefreshToken(user),
    };
  }

  async getProfile(userId) {
    const user = await this.repository.findById(userId, {
      include: [
        {
          model: this.models.Order,
          as: 'orders',
          attributes: ['id', 'total', 'status', 'created_at'],
          limit: 5,
          order: [['created_at', 'DESC']],
        },
      ],
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      throw new HttpError(404, 'User not found', 'NotFoundError');
    }

    return user;
  }

  async requestPasswordReset(email) {
    const user = await this.repository.findByEmail(email);
    if (!user) {
      throw new HttpError(404, 'User not found', 'NotFoundError');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    await user.update({
      resetToken: this.hashResetToken(resetToken),
      resetTokenExpiry,
    });

    return {
      message: 'Password reset token generated',
    };
  }

  async resetPassword(input) {
    const { token, newPassword } = input;
    if (!token) {
      throw new HttpError(400, 'Reset token is required', 'ValidationError');
    }

    this.assertStrongPassword(newPassword);

    const user = await this.repository.findUserByActiveResetToken(this.hashResetToken(token));

    if (!user) {
      throw new HttpError(400, 'Invalid or expired reset token', 'ValidationError');
    }

    await user.update({
      password: newPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });

    return { message: 'Password reset successful' };
  }

  hashResetToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  assertStrongPassword(password) {
    if (!isStrongPassword(password)) {
      throw new HttpError(400, PASSWORD_REQUIREMENTS_MESSAGE, 'ValidationError');
    }
  }

  signToken(user, options = {}) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }

    if (process.env.NODE_ENV !== 'test' && jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
      throw new Error(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long`);
    }

    return jwt.sign({ userId: user.id }, jwtSecret, {
      expiresIn: options.expiresIn || process.env.JWT_EXPIRES_IN,
    });
  }

  signRefreshToken(user) {
    return jwt.sign({ userId: user.id, type: 'refresh' }, env.jwtRefreshSecret, {
      expiresIn: env.jwtRefreshExpiresIn,
    });
  }

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, env.jwtRefreshSecret);
    } catch (err) {
      throw new HttpError(401, err.message, err.name);
    }
  }

  sanitizeUser(user) {
    const userResponse = user.toJSON();
    delete userResponse.password;
    delete userResponse.resetToken;
    delete userResponse.resetTokenExpiry;
    return userResponse;
  }
}

module.exports = AuthService;
