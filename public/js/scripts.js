// Add JavaScript functionality here
console.log('JavaScript is working!');

document.getElementById('products-button').addEventListener('click', async (event) => {
  event.preventDefault();
  try {
    const response = await fetch('/products');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const products = await response.json();
    displayProducts(products);
  } catch (error) {
    console.error('Error fetching products:', error);
  }
});

function displayProducts(products) {
  const container = document.getElementById('products-container');
  container.innerHTML = '';
  const ul = document.createElement('ul');
  products.forEach(product => {
    const li = document.createElement('li');
    li.innerHTML = `
      <h2>${product.name}</h2>
      <p>${product.description}</p>
      <p>Price: $${product.price}</p>
      <p>Stock: ${product.stock}</p>
      <button class="add-to-cart" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}">Add to Cart</button>
    `;
    ul.appendChild(li);
  });
  container.appendChild(ul);

  // Add event listeners to "Add to Cart" buttons
  document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', addToCart);
  });
}

function addToCart(event) {
  const productId = event.target.getAttribute('data-id');
  const productName = event.target.getAttribute('data-name');
  const productPrice = parseFloat(event.target.getAttribute('data-price'));
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const product = cart.find(item => item.id === productId);

  if (product) {
    product.quantity += 1;
  } else {
    cart.push({ id: productId, name: productName, price: productPrice, quantity: 1 });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  alert('Product added to cart');
}

// Add search functionality
document.getElementById('search-input').addEventListener('input', async (event) => {
  const query = event.target.value.toLowerCase();
  try {
    const response = await fetch(`/api/products/search?name=${query}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const products = await response.json();
    displayProducts(products);
  } catch (error) {
    console.error('Error fetching products:', error);
  }
});

// Fetch profile data
async function fetchProfile() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No token found in localStorage'); // Debugging: Log if no token is found
    window.location.href = '/login';
    return;
  }

  try {
    console.log('Token being sent:', token); // Debugging: Log the token being sent
    const response = await fetch('/api/auth/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`, // Include the token in the request headers
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }

    const profile = await response.json();
    displayProfile(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    window.location.href = '/login';
  }
}

function displayProfile(profile) {
  const profileContainer = document.getElementById('profile-container');
  profileContainer.innerHTML = `
    <p>Username: ${profile.username}</p>
    <p>Email: ${profile.email}</p>
  `;
}

// Call fetchProfile if on profile page
if (window.location.pathname === '/profile') {
  fetchProfile();
}