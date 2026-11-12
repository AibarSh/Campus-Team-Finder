const { Prisma } = require('@prisma/client');
const { AppError } = require('../errors');

function translatePrismaError(err) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return { status: 409, message: 'A record with these values already exists' };
    if (err.code === 'P2003') return { status: 400, message: 'Referenced record does not exist' };
    if (err.code === 'P2025') return { status: 404, message: 'Record not found' };
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return { status: 400, message: 'Invalid request data' };
  }
  return null;
}

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }

  const translated = translatePrismaError(err);
  if (translated) {
    return res.status(translated.status).json({ error: translated.message });
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = { errorHandler };
