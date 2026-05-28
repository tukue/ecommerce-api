const crypto = require('crypto');

const generateSecret = () => {
  return crypto.randomBytes(20).toString('hex');
};

const secret = generateSecret();
console.log('Generated Secret:', secret);
