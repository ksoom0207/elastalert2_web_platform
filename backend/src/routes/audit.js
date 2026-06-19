import { Router } from 'express';
import { authenticate } from '../auth/keycloak.js';
import { prisma } from '../db/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Audit log viewer. Admins see everything; developers see only their own actions.
// Paginated via page/pageSize -> returns { items, total, page, pageSize }.
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '25', 10), 1), 200);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const where = req.isAdmin ? {} : { userId: req.user.id };

    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { username: true, email: true } },
          rule: { select: { name: true } },
        },
      }),
    ]);

    res.json({ items, total, page, pageSize });
  })
);

export default router;
