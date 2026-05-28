document.addEventListener('DOMContentLoaded', () => {
  displayCartItems();
});

async function displayCartItems() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const cartItemsContainer = document.getElementById('cart-items');
  const totalPriceContainer = document.getElementById('total-price'); // Add a container for total price
  cartItemsContainer.innerHTML = '';
  let totalCartPrice = 0; // Initialize total cart price

  for (const item of cart) {
    const response = await fetch(`/api/products/${item.id}`);
    if (!response.ok) {
      console.error('Error fetching product details:', response.statusText);
      continue;
    }
    const product = await response.json();
    const itemTotalPrice = product.price * item.quantity; // Calculate total price for the item
    totalCartPrice += itemTotalPrice; // Add to the total cart price

    const li = document.createElement('li');
    li.innerHTML = `
      <div class="cart-item">
        <span>Product: ${product.name}</span>
        <span>Price: $${product.price}</span>
        <span>Total: $<span class="item-total-price" data-id="${item.id}">${itemTotalPrice.toFixed(2)}</span></span>
        <span>Quantity: 
          <button class="decrease-quantity" data-id="${item.id}">-</button>
          <span class="quantity">${item.quantity}</span>
          <button class="increase-quantity" data-id="${item.id}">+</button>
        </span>
        <button class="remove-from-cart" data-id="${item.id}">Remove</button>
      </div>
    `;
    cartItemsContainer.appendChild(li);
  }

  // Update the total cart price in the DOM
  totalPriceContainer.textContent = `Total: $${totalCartPrice.toFixed(2)}`;

  // Add event listeners to "Remove", "+" and "-" buttons
  document.querySelectorAll('.remove-from-cart').forEach((button) => {
    button.addEventListener('click', removeFromCart);
  });

  document.querySelectorAll('.increase-quantity').forEach((button) => {
    button.addEventListener('click', increaseQuantity);
  });

  document.querySelectorAll('.decrease-quantity').forEach((button) => {
    button.addEventListener('click', decreaseQuantity);
  });
}

function removeFromCart(event) {
  const productId = event.target.getAttribute('data-id');
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  cart = cart.filter((item) => item.id !== productId);
  localStorage.setItem('cart', JSON.stringify(cart));
  displayCartItems();
}

function increaseQuantity(event) {
  const productId = event.target.getAttribute('data-id');
  let cart = JSON.parse(localStorage.getItem('cart')) || [];

  const item = cart.find((item) => item.id === productId);
  if (item) {
    item.quantity += 1; // Increase the quantity
    localStorage.setItem('cart', JSON.stringify(cart));
    displayCartItems(); // Refresh the cart display
  }
}

function decreaseQuantity(event) {
  const productId = event.target.getAttribute('data-id');
  let cart = JSON.parse(localStorage.getItem('cart')) || [];

  const item = cart.find((item) => item.id === productId);
  if (item && item.quantity > 1) {
    item.quantity -= 1; // Decrease the quantity
    localStorage.setItem('cart', JSON.stringify(cart));
    displayCartItems(); // Refresh the cart display
  } else if (item && item.quantity === 1) {
    // If quantity is 1, remove the item from the cart
    cart = cart.filter((item) => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    displayCartItems(); // Refresh the cart display
  }
}

document.getElementById('checkout-button').addEventListener('click', async () => {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const userId = localStorage.getItem('userId'); // Assume user ID is stored in localStorage

  try {
    const response = await fetch('/api/checkout/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cart }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const { id, amount, currency } = await response.json();

    // Store the payment details in the database
    await fetch('/api/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        orderId: id, // Assume the order ID is returned from the checkout session
        stripePaymentId: id,
        amount,
        currency,
        status: 'pending',
      }),
    });

    const stripe = Stripe(window.STRIPE_PUBLIC_KEY);
    await stripe.redirectToCheckout({ sessionId: id });
  } catch (error) {
    console.error('Error during checkout:', error);
  }
});

// Clear the cart after a successful transaction
function clearCart() {
  localStorage.removeItem('cart');
  displayCartItems();
}

// Check if the user is on the success page and clear the cart
if (window.location.pathname === '/success') {
  clearCart();
}
