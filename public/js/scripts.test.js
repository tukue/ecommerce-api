// scripts.test.js
global.TextEncoder = require("util").TextEncoder;
global.TextDecoder = require("util").TextDecoder;

const { JSDOM } = require('jsdom');

// Simplified DOM setup
const setupDOM = () => {
    const dom = new JSDOM(`
        <!DOCTYPE html>
        <body>
            <div id="products-container"></div>
            <div id="cart-count">0</div>
            <input id="search-input" />
            <div id="error-message"></div>
        </body>
    `);

    global.window = dom.window;
    global.document = dom.window.document;
    global.fetch = jest.fn();
    global.localStorage = {
        getItem: jest.fn(),
        setItem: jest.fn()
    };

    return dom;
};

describe('Frontend Functions', () => {
    let scripts;

    beforeEach(() => {
        setupDOM();
        jest.clearAllMocks();
        scripts = require('./scripts');
    });

    // Test Product Display
    test('displays products correctly', () => {
        const testProducts = [{
            id: '1',
            name: 'Test Product',
            price: 10,
            stock: 5
        }];

        scripts.displayProducts(testProducts);
        
        const container = document.getElementById('products-container');
        expect(container.innerHTML).toContain('Test Product');
        expect(container.innerHTML).toContain('$10');
    });

    // Test Cart Operations
    test('adds item to cart', () => {
        localStorage.getItem.mockReturnValue('[]');
        
        const mockEvent = {
            preventDefault: jest.fn(),
            target: {
                getAttribute: (attr) => ({
                    'data-id': '1',
                    'data-name': 'Test Product',
                    'data-price': '10'
                }[attr])
            }
        };

        scripts.addToCart(mockEvent);
        
        expect(localStorage.setItem).toHaveBeenCalledWith(
            'cart',
            expect.stringContaining('Test Product')
        );
    });

    // Test Search Function
    test('searches products', async () => {
        const mockProducts = [{ id: '1', name: 'Test Product' }];
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockProducts)
        });

        await scripts.searchProducts('test');
        
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('test'));
    });
});
