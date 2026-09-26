require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const lookupsRoutes = require('./routes/lookups');
const profileRoutes = require('./routes/profile');
const teamsRoutes = require('./routes/teams');
const applicationsRoutes = require('./routes/applications');
const usersRoutes = require('./routes/users');

function createApp() {
  const app = express();
  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/lookups', lookupsRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/teams', teamsRoutes);
  app.use('/api/applications', applicationsRoutes);
  app.use('/api/users', usersRoutes);

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
