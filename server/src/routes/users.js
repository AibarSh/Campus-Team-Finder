const express = require('express');
const { authRequired, profileRequired } = require('../middleware/auth');
const { searchUsers } = require('../controllers/usersController');

const router = express.Router();

router.get('/', authRequired, profileRequired, searchUsers);

module.exports = router;
