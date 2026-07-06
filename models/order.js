const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      Order.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      Order.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
      Order.hasOne(models.Payment, { foreignKey: 'orderId', as: 'payment' });
    }
  }

  Order.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
        },
      },
      total: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0,
        validate: {
          min: 0,
        },
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: [['pending', 'paid', 'shipped', 'completed', 'cancelled']],
        },
      },
    },
    {
      sequelize,
      modelName: 'Order',
      tableName: 'orders',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

  return Order;
};
