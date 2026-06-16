import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../auth/keycloak.js';
import { requireAdmin } from '../auth/rbac.js';
import { prisma } from '../db/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Developers can read which alerter types have a default webhook configured
// (URL itself is only returned to admins).
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const settings = await prisma.webhookSetting.findMany();
    if (req.isAdmin) return res.json(settings);
    res.json(settings.map((s) => ({ type: s.type, configured: true })));
  })
);

const upsertSchema = z.object({
  type: z.enum(['slack', 'mattermost']),
  webhookUrl: z.string().url(),
});

// Admin sets/updates the default webhook (e.g. mattermost infra webhook).
router.put(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { type, webhookUrl } = upsertSchema.parse(req.body);
    const setting = await prisma.webhookSetting.upsert({
      where: { type },
      update: { webhookUrl, updatedBy: req.user.id },
      create: { type, webhookUrl, updatedBy: req.user.id },
    });
    res.json(setting);
  })
);

export default router;
