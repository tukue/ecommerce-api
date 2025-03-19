const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const authController = {
  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      // Check if user already exists
      const existingUser = await req.models.User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
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
        process.env.JWT_SECRET ,
        { expiresIn: '72h' }
      );

      // Remove password from response
      const userResponse = user.toJSON();
      delete userResponse.password;

      return res.status(201).json({
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
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '72h' }
      );

      // Remove password from response
      const userResponse = user.toJSON();
      delete userResponse.password;

      return res.status(200).json({
        user: userResponse,
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  async getProfile(req, res) {
    try {
      const user = await req.models.User.findByPk(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Remove password from response
      const userResponse = user.toJSON();
      delete userResponse.password;

      return res.status(200).json(userResponse);
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
};

module.exports = authController;