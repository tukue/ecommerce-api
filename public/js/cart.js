document.addEventListener('DOMContentLoaded', () => {
  displayCartItems();
});

async function displayCartItems() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const cartItemsContainer = document.getElementById('cart-items');
  cartItemsContainer.innerHTML = '';

  for (const item of cart) {
    const response = await fetch(`/api/products/${item.id}`);
    if (!response.ok) {
      console.error('Error fetching product details:', response.statusText);
      continue;
    }
    const product = await response.json();
    const li = document.createElement('li');
    li.innerHTML = `
      Product: ${product.name}, Quantity: ${item.quantity}
      <button class="remove-from-cart" data-id="${item.id}">Remove</button>
    `;
    cartItemsContainer.appendChild(li);
  }

  // Add event listeners to "Remove" buttons
  document.querySelectorAll('.remove-from-cart').forEach(button => {
    button.addEventListener('click', removeFromCart);
  });
}

function removeFromCart(event) {
  const productId = event.target.getAttribute('data-id');
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  cart = cart.filter(item => item.id !== productId);
  localStorage.setItem('cart', JSON.stringify(cart));
  displayCartItems();
}

document.getElementById('checkout-button').addEventListener('click', async () => {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];

  // Ensure all prices are valid numbers
  for (const item of cart) {
    if (isNaN(item.price)) {
      console.error(`Invalid price for item: ${item.name}`);
      return;
    }
  }

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

    const { id } = await response.json();
    const stripe = Stripe(window.STRIPE_PUBLIC_KEY); // Use the Stripe public key from the global window object
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