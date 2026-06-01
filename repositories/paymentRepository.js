class PaymentRepository {
  constructor(models) {
    this.models = models;
  }

  create(payload) {
    return this.models.Payment.create(payload);
  }

  findAll(options = {}) {
    return this.models.Payment.findAll(options);
  }

  findById(id, options = {}) {
    return this.models.Payment.findByPk(id, options);
  }

  findOrderById(id) {
    return this.models.Order.findByPk(id);
  }
}

module.exports = PaymentRepository;
