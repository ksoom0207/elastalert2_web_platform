import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../config.js';
import { prisma } from '../db/prisma.js';
import { renderRuleYaml } from './ruleRenderer.js';

// Filenames are derived from the rule id so renames never orphan a file.
function ruleFilePath(rule) {
  return path.join(config.rulesFolder, `${rule.id}.yaml`);
}

async function defaultWebhookFor(alerter) {
  const setting = await prisma.webhookSetting.findUnique({ where: { type: alerter } });
  return setting?.webhookUrl;
}

// Write the rendered YAML to the shared rules_folder (active rule).
export async function writeRuleFile(rule) {
  await fs.mkdir(config.rulesFolder, { recursive: true });
  const defaultWebhook = await defaultWebhookFor(rule.alerter);
  const ruleYaml = renderRuleYaml(rule, defaultWebhook);
  await fs.writeFile(ruleFilePath(rule), ruleYaml, 'utf8');
}

// Remove the YAML file (disable / delete). ElastAlert2 stops loading it on next scan.
export async function removeRuleFile(rule) {
  try {
    await fs.unlink(ruleFilePath(rule));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

// Reconcile filesystem with DB state for a single rule.
export async function syncRule(rule) {
  if (rule.enabled) await writeRuleFile(rule);
  else await removeRuleFile(rule);
}

// Full reconcile — useful on startup so the rules_folder matches the DB.
export async function syncAll() {
  await fs.mkdir(config.rulesFolder, { recursive: true });
  const rules = await prisma.rule.findMany();
  for (const rule of rules) await syncRule(rule);
}
