const { prisma } = require('../lib/prisma');
const { signSessionToken } = require('../lib/jwt');
const { hashPassword, verifyPassword } = require('../lib/password');
const { AppError } = require('../errors');

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const KBTU_EMAIL = /^[^\s@]+@kbtu\.kz$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 200;

function readEmail(body) {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) throw new AppError(400, 'email is required');
  return email;
}

function startSession(res, user) {
  res.cookie('session', signSessionToken(user.id), SESSION_COOKIE_OPTIONS);
}

// ponytail: no email confirmation and no password reset, both need a mail service.
// Add them (and a login rate limit) before real students rely on this.
async function register(req, res, next) {
  try {
    const email = readEmail(req.body);
    if (!KBTU_EMAIL.test(email)) throw new AppError(403, 'Use your @kbtu.kz email to sign up');

    const { password } = req.body;
    if (typeof password !== 'string' || password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
      throw new AppError(400, `Password must be ${MIN_PASSWORD} to ${MAX_PASSWORD} characters long`);
    }

    let user;
    try {
      user = await prisma.user.create({
        data: { email, name: email.split('@')[0], passwordHash: hashPassword(password) },
      });
    } catch (err) {
      if (err.code === 'P2002') throw new AppError(409, 'An account with this email already exists');
      throw err;
    }

    startSession(res, user);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const email = readEmail(req.body);
    const found = await prisma.user.findUnique({ where: { email }, omit: { passwordHash: false } });
    if (!found || !verifyPassword(req.body.password, found.passwordHash)) {
      throw new AppError(401, 'Invalid email or password');
    }

    const { passwordHash: _hash, ...user } = found;
    startSession(res, user);
    res.json({ user });
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

module.exports = { register, login, me, logout };
