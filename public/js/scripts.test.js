const { JSDOM } = require('jsdom');

process.env.TEST = 'true';

const setupDOM = () => {
    const dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
        <body>
            <div id="products-container"></div>
            <div id="cart-count">0</div>
            <input id="search-input" />
            <div id="error-message"></div>
            <div id="profile-container"></div>
        </body>
        </html>
    `, {
        url: 'http://localhost/'
    });

    global.window = dom.window;
    global.document = dom.window.document;
    global.navigator = dom.window.navigator;
    global.fetch = jest.fn();
    global.alert = jest.fn();

    const localStorageMock = {
        _storage: {},
        getItem: jest.fn((key) => localStorageMock._storage[key] || null),
        setItem: jest.fn((key, value) => { localStorageMock._storage[key] = value; }),
        clear: jest.fn(() => { localStorageMock._storage = {}; }),
        removeItem: jest.fn((key) => { delete localStorageMock._storage[key]; })
    };
    
    global.localStorage = localStorageMock;

    return dom;
};

describe('Frontend Functions', () => {
    let scripts;
    let dom;

    beforeEach(() => {
        dom = setupDOM();
        jest.resetModules();
        jest.clearAllMocks();
        global.localStorage._storage = {};
        scripts = require('./scripts');
    });

    afterEach(() => {
        if (dom && dom.window) {
            dom.window.close();
        }
    });

    test('displays products correctly', () => {
        const testProducts = [{
            id: '1',
            name: 'Test Product',
            price: 10,
            stock: 5
        }];

        scripts.displayProducts(testProducts);
        
        const container = document.getElementById('products-container');
        expect(container).not.toBeNull();
        expect(container.innerHTML).toContain('Test Product');
        expect(container.innerHTML).toContain('$10');
    });

    test('adds item to cart', () => {
        global.localStorage.getItem.mockImplementation(() => '[]');
        
        const mockEvent = {
            preventDefault: jest.fn(),
            target: {
                getAttribute: jest.fn((attr) => {
                    const attrs = {
                        'data-id': '1',
                        'data-name': 'Test Product',
                        'data-price': '10'
                    };
                    return attrs[attr];
                })
            }
        };

        scripts.addToCart(mockEvent);
        
        expect(global.localStorage.setItem).toHaveBeenCalledWith(
            'cart',
            expect.stringContaining('Test Product')
        );
    });

    test('filters products by search query', () => {
        const testProducts = [
            { id: '1', name: 'Test Product', description: 'A test item' },
            { id: '2', name: 'Another Item', description: 'Not matching' }
        ];
        scripts.state.products = testProducts;

        const displaySpy = jest.spyOn(scripts, 'displayProducts');

        scripts.searchProducts('test');
        expect(displaySpy).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ id: '1' })
            ])
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
                    createdAt: new Date().toISOString()
                }
            ]
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
