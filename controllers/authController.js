const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');

const authController = {
  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      // Validate password strength
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/.test(password)) {
        return res.status(400).json({
          message: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number.'
        });
      }

      // Check if user already exists
      const existingUser = await req.models.User.findOne({ 
        where: { 
          [Op.or]: [{ email }, { username }] 
        } 
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          message: 'User with this email or username already exists' 
        });
      }

      // Create new user
      const user = await req.models.User.create({
        username,
        email,
        password
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      // Remove sensitive data from response
      const userResponse = user.toJSON();
      delete userResponse.password;
      delete userResponse.resetToken;
      delete userResponse.resetTokenExpiry;

      // Return success response
      return res.status(201).json({
        message: 'Registration successful! Welcome to our platform.',
        user: userResponse,
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await req.models.User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password. Please try again.' });
      }

      // Check password
      const isPasswordValid = await user.validatePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid email or password. Please try again.' });
      }

      // Generate token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      // Remove sensitive data from response
      const userResponse = user.toJSON();
      delete userResponse.password;

      return res.status(200).json({
        user: userResponse,
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getProfile(req, res) {
    try {
      const user = await req.models.User.findByPk(req.user.id, {
        include: [
          {
            model: req.models.Order,
            as: 'orders', // Use the alias defined in the association
            attributes: ['id', 'total', 'status', 'createdAt'],
            limit: 5,
            order: [['createdAt', 'DESC']]
          }
        ],
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(200).json({ user });
    } catch (error) {
      console.error('Profile fetch error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;
      const user = await req.models.User.findOne({ where: { email } });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      // Save hashed token
      const hashedToken = await bcrypt.hash(resetToken, 12);
      await user.update({
        resetToken: hashedToken,
        resetTokenExpiry
      });

      // In a real application, send this via email
      return res.status(200).json({
        message: 'Password reset token generated',
        resetToken // In production, this should be sent via email
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      // Find user with valid reset token
      const user = await req.models.User.findOne({
        where: {
          resetTokenExpiry: {
            [Op.gt]: new Date()
          }
        }
      });

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      // Verify token
      const isValidToken = await bcrypt.compare(token, user.resetToken);
      if (!isValidToken) {
        return res.status(400).json({ message: 'Invalid reset token' });
      }

      // Update password
      await user.update({
        password: newPassword,
        resetToken: null,
        resetTokenExpiry: null
      });

      return res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
      console.error('Password reset error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
};

module.exports = authController;