const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      Order.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user' // Alias for the association
      });
    }
  }

  Order.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: true,
        isInt: true
      }
    },
    total: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        notNull: true,
        min: 0
      }
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        isIn: [['pending', 'completed', 'cancelled']]
      }
    }
  }, {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    timestamps: true
  });

  return Order;
};
