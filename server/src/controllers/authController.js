const { prisma } = require('../lib/prisma');
const { verifyGoogleIdToken } = require('../lib/googleAuth');
const { signSessionToken } = require('../lib/jwt');
const { AppError } = require('../errors');

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function loginWithGoogle(req, res, next) {
  try {
    const { idToken } = req.body;
    if (!idToken) throw new AppError(400, 'idToken is required');

    const profile = await verifyGoogleIdToken(idToken);
    if (!profile.email.endsWith('@kbtu.kz')) {
      throw new AppError(403, 'Use your KBTU email to sign in');
    }

    const existing = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
    const user = await prisma.user.upsert({
      where: { googleId: profile.googleId },
      update: { name: profile.name, avatarUrl: profile.avatarUrl },
      create: {
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      },
    });

    const token = signSessionToken(user.id);
    res.cookie('session', token, SESSION_COOKIE_OPTIONS);
    res.json({ user, isNewUser: !existing });
  } catch (err) {
    next(err);
  }
}

async function devLogin(req, res, next) {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) throw new AppError(400, 'email is required');
    if (!email.endsWith('@kbtu.kz')) throw new AppError(403, 'Use your KBTU email to sign in');

    const googleId = `dev:${email}`;
    const existing = await prisma.user.findUnique({ where: { googleId } });
    const user =
      existing ||
      (await prisma.user.create({ data: { googleId, email, name: email.split('@')[0] } }));

    res.cookie('session', signSessionToken(user.id), SESSION_COOKIE_OPTIONS);
    res.json({ user, isNewUser: !existing });
  } catch (err) {
    next(err);
  }
}

function me(req, res) {
  res.json({ user: req.user });
}

function logout(req, res) {
  res.clearCookie('session', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ ok: true });
}

module.exports = { loginWithGoogle, devLogin, me, logout };
