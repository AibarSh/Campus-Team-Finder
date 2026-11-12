const express = require('express');
const request = require('supertest');
const { AppError } = require('../../src/errors');
const { errorHandler } = require('../../src/middleware/errorHandler');

function buildTestApp() {
  const app = express();
  app.get('/known', () => {
    throw new AppError(409, 'conflict happened');
  });
  app.get('/unknown', () => {
    throw new Error('boom');
  });
  app.use(errorHandler);
  return app;
}

test('AppError maps to its status and message', async () => {
  const res = await request(buildTestApp()).get('/known');
  expect(res.status).toBe(409);
  expect(res.body).toEqual({ error: 'conflict happened' });
});

test('unknown errors map to 500', async () => {
  const res = await request(buildTestApp()).get('/unknown');
  expect(res.status).toBe(500);
  expect(res.body).toEqual({ error: 'Internal server error' });
});
