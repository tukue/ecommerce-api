describe('Cart checkout payment payload', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = `
      <ul id="cart-items"></ul>
      <div id="total-price"></div>
      <button id="checkout-button"></button>
    `;
    global.fetch = jest.fn();
    global.localStorage = {
      getItem: jest.fn().mockReturnValue('[]'),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
  });

  it('does not include client-controlled userId in payment payload', () => {
    global.localStorage.getItem.mockImplementation((key) => {
      if (key === 'userId') {
        return 'attacker-controlled-user-id';
      }
      return '[]';
    });

    const { buildPaymentPayload } = require('./cart');

    expect(buildPaymentPayload({ id: 'cs_test_123', amount: 2500, currency: 'usd' })).toEqual({
      orderId: 'cs_test_123',
      stripePaymentId: 'cs_test_123',
      amount: 2500,
      currency: 'usd',
      status: 'pending',
    });
    expect(
      buildPaymentPayload({ id: 'cs_test_123', amount: 2500, currency: 'usd' }),
    ).not.toHaveProperty('userId');
  });
});
