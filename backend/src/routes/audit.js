import { Router } from 'express';
import { authenticate } from '../auth/keycloak.js';
import { prisma } from '../db/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Audit log viewer. Admins see everything; developers see only their own actions.
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const take = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const where = req.isAdmin ? {} : { userId: req.user.id };
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        user: { select: { username: true, email: true } },
        rule: { select: { name: true } },
      },
    });
    res.json(logs);
  })
);

export default router;
