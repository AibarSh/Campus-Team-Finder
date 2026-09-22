const express = require('express');
const { authRequired } = require('../middleware/auth');
const { getProfile, patchProfile } = require('../controllers/profileController');

const router = express.Router();

router.get('/', authRequired, getProfile);
router.patch('/', authRequired, patchProfile);

module.exports = router;
