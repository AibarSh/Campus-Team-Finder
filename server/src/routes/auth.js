const express = require('express');
const { authRequired } = require('../middleware/auth');
const { register, login, me, logout } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authRequired, me);
router.post('/logout', logout);

module.exports = router;
