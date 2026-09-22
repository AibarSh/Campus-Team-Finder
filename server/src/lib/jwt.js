const jwt = require('jsonwebtoken');

function signSessionToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function verifySessionToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  return payload.sub;
}

module.exports = { signSessionToken, verifySessionToken };
