const { Op } = require('sequelize');

class AuthRepository {
  constructor(models) {
    this.models = models;
  }

  findByEmailOrUsername(email, username) {
    return this.models.User.findOne({
      where: {
        [Op.or]: [{ email }, { username }],
      },
    });
  }

  findByEmail(email) {
    return this.models.User.findOne({ where: { email } });
  }

  findById(id, options = {}) {
    return this.models.User.findByPk(id, options);
  }

  createUser(payload) {
    return this.models.User.create(payload);
  }

  findUsersWithActiveResetTokens(now = new Date()) {
    return this.models.User.findAll({
      where: {
        resetTokenExpiry: {
          [Op.gt]: now,
        },
        resetToken: {
          [Op.ne]: null,
        },
      },
    });
  }
}

module.exports = AuthRepository;
