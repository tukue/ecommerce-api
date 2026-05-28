const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

process.env.TEST = 'true';

const setupDOM = () => {
  document.body.innerHTML = `
        <div id="products-container"></div>
        <div id="cart-count">0</div>
        <input id="search-input" />
        <div id="error-message"></div>
        <div id="profile-container"></div>
    `;

  global.fetch = jest.fn();
  global.alert = jest.fn();

  const store = {};
  Object.defineProperty(global, 'localStorage', {
    value: {
      getItem: (key) => store[key] ?? null,
      setItem: (key, value) => {
        store[key] = value;
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
      removeItem: (key) => {
        delete store[key];
      },
    },
    configurable: true,
  });
};

describe('Frontend Functions', () => {
  let scripts;

  beforeEach(() => {
    setupDOM();
    jest.resetModules();
    scripts = require('./scripts');
  });

  test('displays products correctly', () => {
    const testProducts = [
      {
        id: '1',
        name: 'Test Product',
        price: 10,
        stock: 5,
      },
    ];

    scripts.displayProducts(testProducts);

    const container = document.getElementById('products-container');
    expect(container).not.toBeNull();
    expect(container.innerHTML).toContain('Test Product');
    expect(container.innerHTML).toContain('$10');
  });

  test('adds item to cart', () => {
    global.localStorage.setItem('cart', '[]');
    jest.spyOn(global.localStorage, 'setItem');

    const mockEvent = {
      preventDefault: jest.fn(),
      target: {
        getAttribute: jest.fn((attr) => {
          const attrs = {
            'data-id': '1',
            'data-name': 'Test Product',
            'data-price': '10',
          };
          return attrs[attr];
        }),
      },
    };

    scripts.addToCart(mockEvent);

    expect(global.localStorage.setItem).toHaveBeenCalledWith(
      'cart',
      expect.stringContaining('Test Product'),
    );
  });

  test('filters products by search query', () => {
    const testProducts = [
      { id: '1', name: 'Test Product', description: 'A test item' },
      { id: '2', name: 'Another Item', description: 'Not matching' },
    ];
    scripts.state.products = testProducts;

    const displaySpy = jest.spyOn(scripts, 'displayProducts');

    scripts.searchProducts('test');
    expect(displaySpy).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: '1' })]),
    );

    displaySpy.mockClear();
    scripts.searchProducts('');
    expect(displaySpy).toHaveBeenCalledWith(testProducts);

    displaySpy.mockClear();
    scripts.searchProducts('nonexistent');
    expect(displaySpy).toHaveBeenCalledWith([]);

    displaySpy.mockRestore();
  });

  test('displays profile information correctly', () => {
    const testUser = {
      username: 'testuser',
      email: 'test@example.com',
      orders: [
        {
          id: 1,
          total: 100,
          status: 'completed',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    scripts.displayProfile(testUser);

    const container = document.getElementById('profile-container');
    expect(container).not.toBeNull();
    expect(container.innerHTML).toContain('testuser');
    expect(container.innerHTML).toContain('test@example.com');
    expect(container.innerHTML).toContain('Order #1');
    expect(container.innerHTML).toContain('$100');
    expect(container.innerHTML).toContain('completed');
  });
});
