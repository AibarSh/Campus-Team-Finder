// server/tests/lib/googleAuth.test.js
const { OAuth2Client } = require('google-auth-library');
const { verifyGoogleIdToken } = require('../../src/lib/googleAuth');

test('verifyGoogleIdToken maps the Google payload to our profile shape', async () => {
  jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
    getPayload: () => ({
      sub: 'google-sub-1',
      email: 'student@kbtu.kz',
      name: 'Student Name',
      picture: 'https://example.com/pic.jpg',
    }),
  });

  const profile = await verifyGoogleIdToken('fake-id-token');

  expect(profile).toEqual({
    googleId: 'google-sub-1',
    email: 'student@kbtu.kz',
    name: 'Student Name',
    avatarUrl: 'https://example.com/pic.jpg',
  });
});

test('throws if GOOGLE_CLIENT_ID is not configured', async () => {
  const original = process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_ID;
  try {
    await expect(verifyGoogleIdToken('some-token')).rejects.toThrow('GOOGLE_CLIENT_ID is not configured');
  } finally {
    process.env.GOOGLE_CLIENT_ID = original;
  }
});
