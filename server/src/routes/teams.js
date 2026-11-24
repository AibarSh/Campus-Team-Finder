const express = require('express');
const { authRequired, profileRequired } = require('../middleware/auth');
const {
  createTeam,
  updateTeam,
  setOpenRoles,
  publishTeam,
  listMyTeams,
  listTeams,
  recommendTeams,
  closeRecruitment,
  getTeam,
  applyToRole,
  listTeamApplications,
  inviteUser,
} = require('../controllers/teamsController');
const { searchUsers } = require('../controllers/usersController');

const router = express.Router();

router.post('/', authRequired, profileRequired, createTeam);
router.get('/', authRequired, profileRequired, listTeams);
router.get('/mine', authRequired, listMyTeams);
router.get('/recommended', authRequired, profileRequired, recommendTeams);
router.get('/:id', authRequired, profileRequired, getTeam);
router.get('/:id/roles/:roleId/candidates', authRequired, profileRequired, searchUsers);
router.post('/:id/roles/:roleId/apply', authRequired, profileRequired, applyToRole);
router.get('/:id/applications', authRequired, listTeamApplications);
router.post('/:id/invite', authRequired, profileRequired, inviteUser);
router.post('/:id/close-recruitment', authRequired, profileRequired, closeRecruitment);
router.post('/:id/roles/:roleId/close-recruitment', authRequired, profileRequired, closeRecruitment);
router.patch('/:id', authRequired, profileRequired, updateTeam);
router.put('/:id/roles', authRequired, profileRequired, setOpenRoles);
router.post('/:id/publish', authRequired, profileRequired, publishTeam);

module.exports = router;
