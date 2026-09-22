const express = require('express');
const { authRequired } = require('../middleware/auth');
const { listSkills, listInterests, listRoles } = require('../controllers/lookupsController');

const router = express.Router();

router.get('/skills', authRequired, listSkills);
router.get('/interests', authRequired, listInterests);
router.get('/roles', authRequired, listRoles);

module.exports = router;
