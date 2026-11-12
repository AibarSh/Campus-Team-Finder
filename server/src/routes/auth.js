const express = require('express');
const { authRequired } = require('../middleware/auth');
const { loginWithGoogle, devLogin, me, logout } = require('../controllers/authController');

const router = express.Router();

function devLoginEnabled(req, res, next) {
  if (process.env.NODE_ENV === 'production' || process.env.DEV_LOGIN !== 'true') return next('router');
  next();
}

router.post('/google', loginWithGoogle);
router.post('/dev-login', devLoginEnabled, devLogin);
router.get('/me', authRequired, me);
router.post('/logout', logout);

module.exports = router;
