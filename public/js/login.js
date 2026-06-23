document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  if (!email || !password) {
    document.getElementById('error-message').textContent = 'Please fill in all fields.';
    return;
  }

  if (!/\S+@\S+\.\S+/.test(email)) {
    document.getElementById('error-message').textContent = 'Please enter a valid email address.';
    return;
  }

  const button = event.target.querySelector('button');
  button.disabled = true;
  button.textContent = 'Logging in...';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }

    window.location.href = '/profile';
  } catch (error) {
    document.getElementById('error-message').textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = 'Login';
  }
});
