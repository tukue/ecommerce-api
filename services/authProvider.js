'use strict';

const jwksRsa = require('jwks-rsa');
const jwt = require('jsonwebtoken');

let jwksClient = null;

function createJwksClient(issuer) {
  return jwksRsa({
    jwksUri: `${issuer.replace(/\/$/, '')}.well-known/jwks.json`,
    cache: true,
    rateLimit: true,
  });
}

function init(issuer) {
  if (!issuer) return;
  jwksClient = createJwksClient(issuer);
}

const getSigningKey = (kid) =>
  new Promise((resolve, reject) => {
    if (!jwksClient) return reject(new Error('JWKS client not configured'));
    jwksClient.getSigningKey(kid, (err, key) => {
      if (err) return reject(err);
      try {
        const pubKey = key.getPublicKey();
        resolve(pubKey);
      } catch (e) {
        reject(e);
      }
    });
  });

async function verifyAuth0Token(token, { audience, issuer }) {
  if (!jwksClient && issuer) init(issuer);
  const decodedHeader = jwt.decode(token, { complete: true });
  if (!decodedHeader || !decodedHeader.header || !decodedHeader.header.kid) {
    const err = new Error('Invalid token header');
    err.name = 'InvalidTokenError';
    throw err;
  }

  const kid = decodedHeader.header.kid;
  const publicKey = await getSigningKey(kid);

  const decoded = jwt.verify(token, publicKey, {
    audience,
    issuer,
    algorithms: ['RS256'],
  });

  return decoded;
}

function verifyLocalToken(token, secret) {
  return jwt.verify(token, secret);
}

module.exports = {
  init,
  getSigningKey,
  verifyAuth0Token,
  verifyLocalToken,
};
