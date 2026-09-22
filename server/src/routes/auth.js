const express = require('express');
const { authRequired } = require('../middleware/auth');
const { loginWithGoogle, me, logout } = require('../controllers/authController');

const router = express.Router();

router.post('/google', loginWithGoogle);
router.get('/me', authRequired, me);
router.post('/logout', logout);

module.exports = router;
