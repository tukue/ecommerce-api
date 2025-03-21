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
    li.innerHTML = `Product: ${product.name}, Quantity: ${item.quantity}`;
    cartItemsContainer.appendChild(li);
  }
}

document.getElementById('checkout-button').addEventListener('click', () => {
  alert('Checkout functionality not implemented yet.');
});