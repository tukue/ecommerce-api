// scripts.js
const scripts = {
  // Initialize state
  state: {
      cart: [],
      products: [],
      user: null
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
                  <img src="/images/cart.jpg" alt="Cart" class="cart-icon">
                  ${product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
              </button>
          </div>
      `).join('');
  },

  // Fetch Products
  async fetchProducts() {
      try {
          const response = await fetch('/api/products');
          if (!response.ok) throw new Error('Failed to fetch products');
          
          const products = await response.json();
          this.displayProducts(products);
          return products;
      } catch (error) {
          console.error('Error fetching products:', error);
          const errorElement = document.getElementById('error-message');
          if (errorElement) {
              errorElement.textContent = 'Error fetching products';
          }
          return [];
      }
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
          // Retrieve the cart from localStorage or initialize an empty array
          let cart = JSON.parse(localStorage.getItem('cart') || '[]');

          // Check if the product already exists in the cart
          const existingItem = cart.find(item => item.id === productId);

          if (existingItem) {
              // If the product exists, increment its quantity
              existingItem.quantity += 1;
          } else {
              // If the product does not exist, add it with a quantity of 1
              cart.push({
                  id: productId,
                  name: productName,
                  price: productPrice,
                  quantity: 1
              });
          }

          // Save the updated cart back to localStorage
          localStorage.setItem('cart', JSON.stringify(cart));

          // Update the cart display
          this.updateCartDisplay();

          // Notify the user
          alert(`${productName} added to cart!`);
      } catch (error) {
          console.error('Error adding to cart:', error);
      }
  },

  updateCartDisplay() {
      const cartCount = document.getElementById('cart-count');
      try {
          // Retrieve the cart from localStorage
          const cart = JSON.parse(localStorage.getItem('cart') || '[]');

          // Calculate the total quantity of items in the cart
          const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

          // Update the cart count display
          if (cartCount) {
              cartCount.textContent = totalItems.toString();
          }
      } catch (error) {
          console.error('Error updating cart display:', error);
      }
  },

  // Search functionality
  searchProducts(query) {
      if (!query) {
          this.displayProducts(this.state.products);
          return;
      }

      const filteredProducts = this.state.products.filter(product => 
          product.name.toLowerCase().includes(query.toLowerCase()) ||
          (product.description && product.description.toLowerCase().includes(query.toLowerCase()))
      );

      this.displayProducts(filteredProducts);
  },

  // Event listeners
  setupEventListeners() {
      // Products container click event
      const productsContainer = document.getElementById('products-container');
      if (productsContainer) {
          productsContainer.addEventListener('click', (e) => {
              if (e.target.classList.contains('add-to-cart-btn')) {
                  this.addToCart(e);
              }
          });
      }

      // Search input event
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
          searchInput.addEventListener('input', (e) => {
              this.searchProducts(e.target.value);
          });
      }
  },

  // Initialize
  async init() {
      const products = await this.fetchProducts();
      this.state.products = products;
      this.setupEventListeners();
  }
};

// Fetch profile
async function fetchProfile() {
  try {
    const token = localStorage.getItem('token'); // Retrieve the token from localStorage
    if (!token) {
      window.location.href = '/login'; // Redirect to login if no token is found
      return;
    }

    const response = await fetch('/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${token}` // Include the token in the Authorization header
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token'); // Clear invalid token
        window.location.href = '/login'; // Redirect to login
        return;
      }
      throw new Error('Failed to fetch profile');
    }

    const data = await response.json();
    displayProfile(data.user); // Display the profile data
  } catch (error) {
    console.error('Error fetching profile:', error);
    const container = document.getElementById('profile-container');
    if (container) {
      container.innerHTML = '<p class="error">Error loading profile. Please try again.</p>';
    }
  }
}

function displayProfile(user) {
  const container = document.getElementById('profile-container');
  if (!container) return;

  container.innerHTML = `
    <div class="profile-info">
      <h2>Profile Information</h2>
      <p><strong>Username:</strong> ${user.username}</p>
      <p><strong>Email:</strong> ${user.email}</p>
    </div>
    ${user.orders ? `
      <div class="recent-orders">
        <h3>Recent Orders</h3>
        ${user.orders.length > 0 ? `
          <ul>
            ${user.orders.map(order => `
              <li>
                <p>Order #${order.id}</p>
                <p>Total: $${order.total}</p>
                <p>Status: ${order.status}</p>
                <p>Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
              </li>
            `).join('')}
          </ul>
        ` : '<p>No recent orders</p>'}
      </div>
    ` : ''}
  `;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ...scripts,
    displayProfile, // Export displayProfile for testing
  };
} else {
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    scripts.init();
    fetchProfile();
  });
}
