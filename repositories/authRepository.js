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

  // Auth0 specific helpers
  findByAuth0Id(auth0Id) {
    if (!auth0Id) {
      return null;
    }
    return this.models.User.findOne({ where: { auth0Id } });
  }

  linkAuth0Id(userId, auth0Id) {
    return this.models.User.update({ auth0Id }, { where: { id: userId } });
  }
}


module.exports = AuthRepository;
