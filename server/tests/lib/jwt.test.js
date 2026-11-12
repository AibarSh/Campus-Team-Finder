const { signSessionToken, verifySessionToken } = require('../../src/lib/jwt');

test('signs and verifies a session token round-trip', () => {
  const token = signSessionToken('user-123');
  expect(verifySessionToken(token)).toBe('user-123');
});

test('throws on a tampered token', () => {
  const token = signSessionToken('user-123');
  expect(() => verifySessionToken(token + 'tampered')).toThrow();
});
