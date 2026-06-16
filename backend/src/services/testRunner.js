import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { config } from '../config.js';
import { prisma } from '../db/prisma.js';
import { renderRuleYaml } from './ruleRenderer.js';

// Run a real-data dry-run via `elastalert-test-rule` inside the ElastAlert2
// container, so it reuses the admin-managed config.yaml + Elasticsearch creds.
//
// We write the candidate rule to a temp file on the shared volume, then exec
// the test inside the container. `--alert` actually sends the alert (real test
// alarm); omit it to only count matches.
export async function runDryRun(rule, { sendAlert = true } = {}) {
  const setting = await prisma.webhookSetting.findUnique({ where: { type: rule.alerter } });
  const ruleYaml = renderRuleYaml(rule, setting?.webhookUrl);

  // Place temp rule on the shared volume so the ElastAlert2 container sees it.
  const tmpName = `._test_${rule.id || 'draft'}_${Date.now()}.yaml`;
  const hostPath = path.join(config.rulesFolder, tmpName);
  const containerRulePath = path.posix.join(
    path.posix.dirname(config.test.configPath),
    'rules',
    tmpName
  );

  await fs.mkdir(config.rulesFolder, { recursive: true });
  await fs.writeFile(hostPath, ruleYaml, 'utf8');

  const args = [
    'exec', config.test.containerName,
    'elastalert-test-rule',
    '--config', config.test.configPath,
    containerRulePath,
  ];
  if (sendAlert) args.push('--alert');

  try {
    return await execCommand('docker', args, config.test.timeoutMs);
  } finally {
    await fs.unlink(hostPath).catch(() => {});
  }
}

function execCommand(cmd, args, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args);
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);

    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ ok: false, code: -1, stdout, stderr: `${stderr}\n${err.message}` });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, code, stdout, stderr });
    });
  });
}
