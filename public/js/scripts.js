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
    `;
    ul.appendChild(li);
  });
  container.appendChild(ul);
}