const { DataTypes } = require('sequelize');

module.exports = (sequelize, models) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0, // Ensure price is non-negative
      },
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0, // Ensure stock is non-negative
      },
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'products', // Ensure the table name is correct
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  Product.hasMany(models.Order, {
    foreignKey: 'productId',
    as: 'orders' // Alias for the association
  });

  return Product;
};
