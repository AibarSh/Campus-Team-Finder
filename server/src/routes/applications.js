const express = require('express');
const { authRequired } = require('../middleware/auth');
const { listMyApplications, respondToApplication } = require('../controllers/applicationsController');

const router = express.Router();

router.get('/mine', authRequired, listMyApplications);
router.patch('/:id', authRequired, respondToApplication);

module.exports = router;
