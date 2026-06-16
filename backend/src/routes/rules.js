import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../auth/keycloak.js';
import { requireOwnerOrAdmin } from '../auth/rbac.js';
import { prisma } from '../db/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { syncRule, removeRuleFile } from '../services/ruleSync.js';
import { validateCustomYaml, renderRuleYaml } from '../services/ruleRenderer.js';
import { runDryRun } from '../services/testRunner.js';

const router = Router();

const alerterConfigSchema = z
  .object({
    channelOverride: z.string().optional(),
    usernameOverride: z.string().optional(),
    msgColor: z
      .string()
      .regex(/^(good|warning|danger|#[0-9a-fA-F]{6})$/, 'good | warning | danger | #HEX')
      .optional(),
    webhookOverride: z.string().url().optional(),
  })
  .strict();

const ruleSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9_-]+$/, '영문/숫자/-/_ 만 허용'),
  description: z.string().optional(),
  template: z.enum(['K8S_ERROR', 'APM_500', 'SERVER_METRIC', 'CUSTOM']),
  esIndex: z.string().optional().default(''),
  params: z.record(z.any()).optional().default({}),
  alerter: z.enum(['slack', 'mattermost']),
  alerterConfig: alerterConfigSchema.optional().default({}),
  rawYaml: z.string().optional(),
});

function validateRulePayload(data) {
  if (data.template === 'CUSTOM') {
    if (!data.rawYaml) throw httpError(400, 'Custom 룰은 rawYaml이 필요합니다');
    const v = validateCustomYaml(data.rawYaml);
    if (!v.ok) throw httpError(400, v.error);
  } else if (!data.esIndex) {
    throw httpError(400, '템플릿 룰은 esIndex가 필요합니다');
  }
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

async function audit(action, ruleId, userId, detail = {}) {
  await prisma.auditLog.create({ data: { action, ruleId, userId, detail } });
}

// List rules. Developers see only their own; admins see everything.
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const where = req.isAdmin ? {} : { ownerId: req.user.id };
    const rules = await prisma.rule.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { owner: { select: { username: true, email: true } } },
    });
    res.json(rules);
  })
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const rule = await prisma.rule.findUnique({ where: { id: req.params.id } });
    if (!rule) throw httpError(404, 'Rule not found');
    if (!req.isAdmin && rule.ownerId !== req.user.id) throw httpError(403, 'Forbidden');
    res.json({ ...rule, renderedYaml: safeRender(rule) });
  })
);

function safeRender(rule) {
  try {
    return renderRuleYaml(rule, undefined);
  } catch {
    return null;
  }
}

// Create a rule (starts disabled; no YAML file written until enabled).
router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = ruleSchema.parse(req.body);
    validateRulePayload(data);
    const rule = await prisma.rule.create({
      data: { ...data, enabled: false, ownerId: req.user.id },
    });
    await audit('CREATE', rule.id, req.user.id, { name: rule.name });
    res.status(201).json(rule);
  })
);

const ownerOf = (req) =>
  prisma.rule.findUnique({ where: { id: req.params.id } }).then((r) => r?.ownerId);

router.put(
  '/:id',
  authenticate,
  requireOwnerOrAdmin(ownerOf),
  asyncHandler(async (req, res) => {
    const data = ruleSchema.partial().parse(req.body);
    const existing = await prisma.rule.findUnique({ where: { id: req.params.id } });
    if (!existing) throw httpError(404, 'Rule not found');
    validateRulePayload({ ...existing, ...data });

    const rule = await prisma.rule.update({ where: { id: req.params.id }, data });
    // Keep the YAML file consistent if the rule is currently active.
    await syncRule(rule);
    await audit('UPDATE', rule.id, req.user.id, { fields: Object.keys(data) });
    res.json(rule);
  })
);

router.delete(
  '/:id',
  authenticate,
  requireOwnerOrAdmin(ownerOf),
  asyncHandler(async (req, res) => {
    const rule = await prisma.rule.findUnique({ where: { id: req.params.id } });
    if (!rule) throw httpError(404, 'Rule not found');
    await removeRuleFile(rule);
    await prisma.rule.delete({ where: { id: rule.id } });
    await audit('DELETE', null, req.user.id, { name: rule.name });
    res.status(204).end();
  })
);

// Enable / disable -> writes or removes the YAML file in the shared volume.
router.post(
  '/:id/enable',
  authenticate,
  requireOwnerOrAdmin(ownerOf),
  asyncHandler(async (req, res) => {
    const rule = await prisma.rule.update({
      where: { id: req.params.id },
      data: { enabled: true },
    });
    await syncRule(rule);
    await audit('ENABLE', rule.id, req.user.id);
    res.json(rule);
  })
);

router.post(
  '/:id/disable',
  authenticate,
  requireOwnerOrAdmin(ownerOf),
  asyncHandler(async (req, res) => {
    const rule = await prisma.rule.update({
      where: { id: req.params.id },
      data: { enabled: false },
    });
    await syncRule(rule);
    await audit('DISABLE', rule.id, req.user.id);
    res.json(rule);
  })
);

// Real-data dry run: runs elastalert-test-rule and (optionally) sends the alert.
router.post(
  '/:id/test',
  authenticate,
  requireOwnerOrAdmin(ownerOf),
  asyncHandler(async (req, res) => {
    const rule = await prisma.rule.findUnique({ where: { id: req.params.id } });
    if (!rule) throw httpError(404, 'Rule not found');
    const sendAlert = req.body?.sendAlert !== false;
    const result = await runDryRun(rule, { sendAlert });
    await audit('TEST', rule.id, req.user.id, { ok: result.ok, sendAlert });
    res.json(result);
  })
);

export default router;
