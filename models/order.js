const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {}

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
        isInt: true,
        min: 1
      }
    },
    totalPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        notNull: true,
        min: 0
      }
    }
  }, {
    sequelize,
    modelName: 'Order'
  });

  return Order;
};
