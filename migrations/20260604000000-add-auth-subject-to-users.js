'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'auth_subject', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
  },

  down: async (queryInterface, _Sequelize) => {
    await queryInterface.removeColumn('users', 'auth_subject');
  },
};
