const express = require('express');
const { authRequired, profileRequired } = require('../middleware/auth');
const { createTeam, setOpenRoles, publishTeam, listMyTeams } = require('../controllers/teamsController');

const router = express.Router();

router.post('/', authRequired, profileRequired, createTeam);
router.put('/:id/roles', authRequired, profileRequired, setOpenRoles);
router.post('/:id/publish', authRequired, profileRequired, publishTeam);
router.get('/mine', authRequired, listMyTeams);

module.exports = router;
