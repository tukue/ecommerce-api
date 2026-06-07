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

  findByUsername(username) {
    return this.models.User.findOne({ where: { username } });
  }

  findById(id, options = {}) {
    return this.models.User.findByPk(id, options);
  }

  createUser(payload) {
    return this.models.User.create(payload);
  }

  findUserByActiveResetToken(resetToken, now = new Date()) {
    return this.models.User.findOne({
      where: {
        resetToken,
        resetTokenExpiry: {
          [Op.gt]: now,
        },
      },
    });
  }

  findByAuthSubject(authSubject) {
    if (!authSubject) {
      return null;
    }
    return this.models.User.findOne({ where: { authSubject } });
  }

  linkAuthSubject(userId, authSubject) {
    return this.models.User.update({ authSubject }, { where: { id: userId } });
  }
}

module.exports = AuthRepository;
