const { PrismaClient } = require('@prisma/client');

// passwordHash is left out of every query result unless a query asks for it,
// so it cannot leak through `include: { creator: true }` or `res.json(user)`.
const prisma = new PrismaClient({ omit: { user: { passwordHash: true } } });

module.exports = { prisma };
