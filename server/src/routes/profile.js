const express = require('express');
const { authRequired } = require('../middleware/auth');
const {
  getProfile,
  patchProfile,
  putSkills,
  putInterests,
  putPreferredRoles,
  completeProfile,
} = require('../controllers/profileController');

const router = express.Router();

router.get('/', authRequired, getProfile);
router.patch('/', authRequired, patchProfile);
router.put('/skills', authRequired, putSkills);
router.put('/interests', authRequired, putInterests);
router.put('/preferred-roles', authRequired, putPreferredRoles);
router.post('/complete', authRequired, completeProfile);

module.exports = router;
