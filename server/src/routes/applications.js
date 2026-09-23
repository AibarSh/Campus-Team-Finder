const express = require('express');
const { authRequired } = require('../middleware/auth');
const { listMyApplications } = require('../controllers/applicationsController');

const router = express.Router();

router.get('/mine', authRequired, listMyApplications);

module.exports = router;
