const { randomBytes, scryptSync, timingSafeEqual } = require('crypto');

// Stored as "salt:hash" in hex. scrypt is built into Node, so no extra dependency.
function hashPassword(password) {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${scryptSync(password, salt, 64).toString('hex')}`;
}

function verifyPassword(password, stored) {
  if (typeof password !== 'string' || !stored) return false;
  const [salt, hash] = stored.split(':');
  const expected = Buffer.from(hash, 'hex');
  return timingSafeEqual(scryptSync(password, Buffer.from(salt, 'hex'), expected.length), expected);
}

module.exports = { hashPassword, verifyPassword };
