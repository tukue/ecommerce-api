'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add a nullable unique column to store the Auth0 user id (sub)
    await queryInterface.addColumn('users', 'auth0_id', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
  },

  down: async (queryInterface, _Sequelize) => {
    await queryInterface.removeColumn('users', 'auth0_id');
  },
};
