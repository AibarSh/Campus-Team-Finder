require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const lookupsRoutes = require('./routes/lookups');

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

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
