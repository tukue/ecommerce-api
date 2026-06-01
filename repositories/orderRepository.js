class OrderRepository {
  constructor(models) {
    this.models = models;
  }

  create(payload) {
    return this.models.Order.create(payload);
  }

  findAll(options = {}) {
    return this.models.Order.findAll(options);
  }

  findById(id, options = {}) {
    return this.models.Order.findByPk(id, options);
  }

  updateById(id, payload) {
    return this.models.Order.update(payload, {
      where: { id },
    });
  }

  deleteById(id) {
    return this.models.Order.destroy({
      where: { id },
    });
  }

  findUserById(id) {
    return this.models.User.findByPk(id);
  }

  findProductById(id) {
    return this.models.Product.findByPk(id);
  }
}

module.exports = OrderRepository;
