// Vercel entry point: the whole Express API runs as one serverless function.
// vercel.json sends every /api/* request here; Express still sees the original path.
module.exports = require('../server/src/index').createApp();
