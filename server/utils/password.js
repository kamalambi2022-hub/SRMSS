const crypto = require('crypto');

// Uses Node's built-in scrypt KDF, so no extra dependency (bcrypt/argon2) is
// required. Format stored in the DB: "scrypt:<saltHex>:<hashHex>".

const KEY_LEN = 64;

function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plainPassword, salt, KEY_LEN).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

function verifyPassword(plainPassword, stored) {
  if (!stored || !stored.startsWith('scrypt:')) return false;
  const [, salt, hashHex] = stored.split(':');
  const derived = crypto.scryptSync(plainPassword, salt, KEY_LEN);
  const stored_ = Buffer.from(hashHex, 'hex');
  if (derived.length !== stored_.length) return false;
  return crypto.timingSafeEqual(derived, stored_);
}

module.exports = { hashPassword, verifyPassword };
