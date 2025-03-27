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
            <div id="profile-container"></div>
        </body>
    `);

    global.window = dom.window;
    global.document = dom.window.document;
    global.fetch = jest.fn();
    global.localStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        clear: jest.fn(),
        removeItem: jest.fn()
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
        expect(container).not.toBeNull(); // Ensure the container is not null
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
    test('filters products by search query', () => {
        const testProducts = [
            { id: '1', name: 'Test Product', description: 'A test item' },
            { id: '2', name: 'Another Item', description: 'Not matching' }
        ];
        scripts.state.products = testProducts;

        // Mock displayProducts to verify it's called with filtered results
        const displaySpy = jest.spyOn(scripts, 'displayProducts');

        // Test search by name
        scripts.searchProducts('test');
        expect(displaySpy).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ id: '1' })
            ])
        );
        expect(displaySpy).toHaveBeenCalledWith(
            expect.not.arrayContaining([
                expect.objectContaining({ id: '2' })
            ])
        );

        // Test search by description
        displaySpy.mockClear();
        scripts.searchProducts('test item');
        expect(displaySpy).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ id: '1' })
            ])
        );

        // Test empty search
        displaySpy.mockClear();
        scripts.searchProducts('');
        expect(displaySpy).toHaveBeenCalledWith(testProducts);

        // Test no matches
        displaySpy.mockClear();
        scripts.searchProducts('nonexistent');
        expect(displaySpy).toHaveBeenCalledWith([]);

        displaySpy.mockRestore();
    });

    // Test Profile Display
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
