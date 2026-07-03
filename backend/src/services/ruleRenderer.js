import yaml from 'js-yaml';
import { TEMPLATES } from './templates.js';

// Build the alerter-specific block of an ElastAlert2 rule.
// `defaultWebhook` is the admin-configured webhook for the alerter type;
// the developer may override it via alerterConfig.webhookOverride.
function buildAlerterBlock(alerter, cfg = {}, defaultWebhook) {
  const block = { alert: [alerter] };
  const webhook = cfg.webhookOverride || defaultWebhook;

  if (alerter === 'mattermost') {
    if (webhook) block.mattermost_webhook_url = webhook;
    if (cfg.channelOverride) block.mattermost_channel_override = cfg.channelOverride;
    if (cfg.usernameOverride) block.mattermost_username_override = cfg.usernameOverride;
    if (cfg.msgColor) block.mattermost_msg_color = cfg.msgColor; // good|warning|danger|#HEX
  } else if (alerter === 'slack') {
    if (webhook) block.slack_webhook_url = webhook;
    if (cfg.channelOverride) block.slack_channel_override = cfg.channelOverride;
    if (cfg.usernameOverride) block.slack_username_override = cfg.usernameOverride;
    if (cfg.msgColor) block.slack_msg_color = cfg.msgColor;
  }
  return block;
}

// Turn a DB rule record into an ElastAlert2 rule object (then YAML string).
// `defaultWebhook` = WebhookSetting.webhookUrl for the rule's alerter type.
export function renderRuleObject(rule, defaultWebhook) {
  // Custom rules: the user owns the full body. We only enforce `name` so the
  // platform can still map the file back to the DB record.
  if (rule.template === 'CUSTOM') {
    const parsed = rule.rawYaml ? yaml.load(rule.rawYaml) : {};
    return { ...(parsed || {}), name: rule.name };
  }

  const tpl = TEMPLATES[rule.template];
  if (!tpl) throw new Error(`Unknown template: ${rule.template}`);

  // Merge template-field defaults into params so values shown as UI defaults
  // (e.g. realertMinutes=5) still apply even if the frontend never persisted
  // them into rule.params. Explicit user values always win.
  const params = withDefaults(tpl, rule.params || {});

  const base = {
    name: rule.name,
    index: rule.esIndex,
    ...tpl.build(params),
    ...buildAlerterBlock(rule.alerter, rule.alerterConfig || {}, defaultWebhook),
  };
  return base;
}

function withDefaults(tpl, params) {
  const merged = { ...params };
  for (const fld of tpl.fields || []) {
    if (fld.default !== undefined && merged[fld.name] === undefined) {
      merged[fld.name] = fld.default;
    }
  }
  return merged;
}

export function renderRuleYaml(rule, defaultWebhook) {
  // Custom rules are written verbatim so comments / formatting are preserved
  // exactly as the user typed them. Validation (incl. name match) happens on save.
  if (rule.template === 'CUSTOM') return rule.rawYaml || '';
  const obj = renderRuleObject(rule, defaultWebhook);
  return yaml.dump(obj, { lineWidth: 120, noRefs: true });
}

// Validate that custom YAML parses and has the minimum required fields.
// Since custom YAML is written verbatim, we require an explicit `name` that
// matches the rule name so the ElastAlert2 rule name stays consistent with the
// platform's record (the file itself is named by rule id).
export function validateCustomYaml(rawYaml, expectedName) {
  let parsed;
  try {
    parsed = yaml.load(rawYaml);
  } catch (e) {
    return { ok: false, error: `YAML parse error: ${e.message}` };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'YAML must define a mapping' };
  }
  if (!parsed.name) return { ok: false, error: 'Missing required field: name' };
  if (!parsed.type) return { ok: false, error: 'Missing required field: type' };
  if (!parsed.index) return { ok: false, error: 'Missing required field: index' };
  if (!parsed.alert) return { ok: false, error: 'Missing required field: alert' };
  if (expectedName && parsed.name !== expectedName) {
    return {
      ok: false,
      error: `YAML의 name("${parsed.name}")이 룰 이름("${expectedName}")과 일치해야 합니다`,
    };
  }
  return { ok: true };
}
