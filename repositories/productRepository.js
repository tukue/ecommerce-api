const { Op } = require('sequelize');

class ProductRepository {
  constructor(productModel) {
    this.productModel = productModel;
  }

  create(payload) {
    return this.productModel.create(payload);
  }

  findAll() {
    return this.productModel.findAll();
  }

  findById(id) {
    return this.productModel.findByPk(id);
  }

  searchByName(name) {
    return this.productModel.findAll({
      where: {
        name: {
          [Op.like]: `%${name}%`,
        },
      },
    });
  }
}

module.exports = ProductRepository;
