const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const HttpError = require('../utils/httpError');
const AuthRepository = require('../repositories/authRepository');

const PASSWORD_REQUIREMENTS_MESSAGE =
  'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.';

const isStrongPassword = (password) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);

class AuthService {
  constructor(models) {
    this.models = models;
    this.repository = new AuthRepository(models);
  }

  async register(input) {
    const { username, email, password } = input;

    const existingUser = await this.repository.findByEmailOrUsername(email, username);
    if (existingUser) {
      throw new HttpError(400, 'User with this email or username already exists', 'ValidationError');
    }

    this.assertStrongPassword(password);

    const user = await this.repository.createUser({ username, email, password });

    return {
      message: 'Registration successful! Welcome to our platform.',
      user: this.sanitizeUser(user),
      token: this.signToken(user),
    };
  }

  async login(input) {
    const { email, password } = input;
    const user = await this.repository.findByEmail(email);

    if (!user || !(await user.validatePassword(password))) {
      throw new HttpError(401, 'Invalid email or password. Please try again.', 'AuthenticationError');
    }

    return {
      user: this.sanitizeUser(user),
      token: this.signToken(user),
    };
  }

  async getProfile(userId) {
    const user = await this.repository.findById(userId, {
      include: [
        {
          model: this.models.Order,
          as: 'orders',
          attributes: ['id', 'total', 'status', 'createdAt'],
          limit: 5,
          order: [['createdAt', 'DESC']],
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
    const hashedToken = await bcrypt.hash(resetToken, 12);

    await user.update({
      resetToken: hashedToken,
      resetTokenExpiry,
    });

    return {
      message: 'Password reset token generated',
      resetToken,
    };
  }

  async resetPassword(input) {
    const { token, newPassword } = input;
    this.assertStrongPassword(newPassword);

    const users = await this.repository.findUsersWithActiveResetTokens();
    const user = await this.findUserByResetToken(users, token);

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

  async findUserByResetToken(users, token) {
    for (const candidate of users) {
      if (await bcrypt.compare(token, candidate.resetToken)) {
        return candidate;
      }
    }

    return null;
  }

  assertStrongPassword(password) {
    if (!isStrongPassword(password)) {
      throw new HttpError(400, PASSWORD_REQUIREMENTS_MESSAGE, 'ValidationError');
    }
  }

  signToken(user) {
    return jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
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
