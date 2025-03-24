// scripts.js
const scripts = {
  // Initialize state
  state: {
      cart: [],
      products: []
  },

  // Display Products
  displayProducts(products) {
      const container = document.getElementById('products-container');
      if (!container) return;

      container.innerHTML = products.map(product => `
          <div class="product-item" data-testid="product-${product.id}">
              <h3>${product.name}</h3>
              <p>${product.description || ''}</p>
              <p class="price">$${product.price}</p>
              <p class="stock">Stock: ${product.stock}</p>
              <button 
                  class="add-to-cart-btn"
                  data-id="${product.id}"
                  data-name="${product.name}"
                  data-price="${product.price}"
                  ${product.stock <= 0 ? 'disabled' : ''}>
                  ${product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
              </button>
          </div>
      `).join('');
  },

  // Cart Operations
  addToCart(event) {
      if (!event || !event.target) return;
      
      const target = event.target;
      const productId = target.getAttribute('data-id');
      const productName = target.getAttribute('data-name');
      const productPrice = parseFloat(target.getAttribute('data-price'));

      if (!productId || !productName || isNaN(productPrice)) return;

      try {
          let cart = JSON.parse(localStorage.getItem('cart') || '[]');
          const existingItem = cart.find(item => item.id === productId);

          if (existingItem) {
              existingItem.quantity += 1;
          } else {
              cart.push({
                  id: productId,
                  name: productName,
                  price: productPrice,
                  quantity: 1
              });
          }

          localStorage.setItem('cart', JSON.stringify(cart));
          this.updateCartDisplay();
          return true;
      } catch (error) {
          console.error('Error adding to cart:', error);
          return false;
      }
  },

  updateCartDisplay() {
      const cartCount = document.getElementById('cart-count');
      const cartTotal = document.getElementById('cart-total');
      
      try {
          const cart = JSON.parse(localStorage.getItem('cart') || '[]');
          
          if (cartCount) {
              const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
              cartCount.textContent = totalItems.toString();
          }

          if (cartTotal) {
              const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
              cartTotal.textContent = `$${total.toFixed(2)}`;
          }
      } catch (error) {
          console.error('Error updating cart display:', error);
      }
  },

  // Search functionality
  async searchProducts(query) {
      try {
          const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
          if (!response.ok) throw new Error('Search failed');
          
          const products = await response.json();
          this.displayProducts(products);
          return products;
      } catch (error) {
          console.error('Search error:', error);
          const errorElement = document.getElementById('error-message');
          if (errorElement) {
              errorElement.textContent = 'Error searching products';
          }
          return [];
      }
  },

  // Event listeners
  setupEventListeners() {
      // Search input handler
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
          let debounceTimeout;
          searchInput.addEventListener('input', (e) => {
              clearTimeout(debounceTimeout);
              debounceTimeout = setTimeout(() => {
                  this.searchProducts(e.target.value);
              }, 300);
          });
      }

      // Add to cart buttons
      document.addEventListener('click', (e) => {
          if (e.target.classList.contains('add-to-cart-btn')) {
              this.addToCart(e);
          }
      });

      // Initial cart display
      this.updateCartDisplay();
  },

  // Initialize
  init() {
      this.setupEventListeners();
      return this;
  }
};

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = scripts;
} else if (typeof window !== 'undefined') {
  window.scripts = scripts;
  document.addEventListener('DOMContentLoaded', () => scripts.init());
}
