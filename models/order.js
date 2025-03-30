const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Order extends Model {
    static associate(models) {
      // Associate Order with User
      Order.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user' // Alias for the association
      });

      // Associate Order with Product
      Order.belongsTo(models.Product, {
        foreignKey: 'productId',
        as: 'product' // Alias for the association
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
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: true,
        isInt: true
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: true,
        min: 1
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
