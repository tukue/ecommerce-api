const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const HttpError = require('../utils/httpError');
const AuthRepository = require('../repositories/authRepository');

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

  async findByAuth0Id(auth0Id) {
    return this.repository.findByAuth0Id(auth0Id);
  }

  async findByEmail(email) {
    return this.repository.findByEmail(email);
  }

  async provisionUserFromOidc(oidcUser) {
    if (!oidcUser) return null;
    const auth0Id = oidcUser.sub;
    const email = oidcUser.email;
    if (!email) return null;

    // Prefer mapping by auth0Id
    let user = null;
    if (auth0Id) user = await this.repository.findByAuth0Id(auth0Id);
    if (user) return user;

    // Fallback to email mapping
    user = await this.repository.findByEmail(email);
    if (user) {
      if (!user.auth0Id && auth0Id) {
        await this.repository.linkAuth0Id(user.id, auth0Id);
        user.auth0Id = auth0Id;
      }
      return user;
    }

    // Create new user
    const usernameBase = oidcUser.name ? oidcUser.name.replace(/\s+/g, '_').toLowerCase() : email.split('@')[0];
    const username = usernameBase.slice(0, 30);
    const randomPassword = crypto.randomBytes(24).toString('hex');

    user = await this.repository.createUser({ username, email, password: randomPassword, auth0Id });
    return user;
  }

  async provisionUserFromToken(decodedToken) {
    if (!decodedToken) return null;
    const auth0Id = decodedToken.sub;
    const email = decodedToken.email;
    if (!email) return null;

    let user = null;
    if (auth0Id) user = await this.repository.findByAuth0Id(auth0Id);
    if (user) return user;

    user = await this.repository.findByEmail(email);
    if (user) {
      if (!user.auth0Id && auth0Id) {
        await this.repository.linkAuth0Id(user.id, auth0Id);
        user.auth0Id = auth0Id;
      }
      return user;
    }

    const usernameBase = decodedToken.name ? decodedToken.name.replace(/\s+/g, '_').toLowerCase() : email.split('@')[0];
    const username = usernameBase.slice(0, 30);
    const randomPassword = crypto.randomBytes(24).toString('hex');

    user = await this.repository.createUser({ username, email, password: randomPassword, auth0Id });
    return user;
  }


  // Provision users from OIDC id token / userinfo
  async provisionUserFromOidc(oidcUser) {
    if (!oidcUser) return null;
    const auth0Id = oidcUser.sub;
    const email = oidcUser.email;
    if (!email) return null;

    // Prefer mapping by auth0Id
    let user = null;
    if (auth0Id) user = await this.repository.findByAuth0Id(auth0Id);
    if (user) return user;

    // Fallback to email mapping
    user = await this.repository.findByEmail(email);
    if (user) {
      if (!user.auth0Id && auth0Id) {
        await this.repository.linkAuth0Id(user.id, auth0Id);
        user.auth0Id = auth0Id;
      }
      return user;
    }

    // Create new user
    const usernameBase = oidcUser.name ? oidcUser.name.replace(/\s+/g, '_').toLowerCase() : email.split('@')[0];
    const username = usernameBase.slice(0, 30);
    const randomPassword = crypto.randomBytes(24).toString('hex');

    user = await this.repository.createUser({ username, email, password: randomPassword, auth0Id });
    return user;
  }

  async provisionUserFromToken(decodedToken) {
    if (!decodedToken) return null;
    const auth0Id = decodedToken.sub;
    const email = decodedToken.email;
    if (!email) return null;

    let user = null;
    if (auth0Id) user = await this.repository.findByAuth0Id(auth0Id);
    if (user) return user;

    user = await this.repository.findByEmail(email);
    if (user) {
      if (!user.auth0Id && auth0Id) {
        await this.repository.linkAuth0Id(user.id, auth0Id);
        user.auth0Id = auth0Id;
      }
      return user;
    }

    const usernameBase = decodedToken.name ? decodedToken.name.replace(/\s+/g, '_').toLowerCase() : email.split('@')[0];
    const username = usernameBase.slice(0, 30);
    const randomPassword = crypto.randomBytes(24).toString('hex');

    user = await this.repository.createUser({ username, email, password: randomPassword, auth0Id });
    return user;
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

  signToken(user) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }

    if (process.env.NODE_ENV !== 'test' && jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
      throw new Error(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long`);
    }

    return jwt.sign({ userId: user.id }, jwtSecret, {
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
