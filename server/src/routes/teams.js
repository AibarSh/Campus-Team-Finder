const express = require('express');
const { authRequired, profileRequired } = require('../middleware/auth');
const {
  createTeam,
  setOpenRoles,
  publishTeam,
  listMyTeams,
  listTeams,
  getTeam,
  applyToRole,
  listTeamApplications,
  inviteUser,
} = require('../controllers/teamsController');

const router = express.Router();

router.post('/', authRequired, profileRequired, createTeam);
router.get('/', authRequired, profileRequired, listTeams);
router.get('/mine', authRequired, listMyTeams);
router.get('/:id', authRequired, profileRequired, getTeam);
router.post('/:id/roles/:roleId/apply', authRequired, profileRequired, applyToRole);
router.get('/:id/applications', authRequired, listTeamApplications);
router.post('/:id/invite', authRequired, profileRequired, inviteUser);
router.put('/:id/roles', authRequired, profileRequired, setOpenRoles);
router.post('/:id/publish', authRequired, profileRequired, publishTeam);

module.exports = router;
