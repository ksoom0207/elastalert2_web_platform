import { keycloak } from '../auth/keycloak.js';

const BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${keycloak.token}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed: ${res.status}`);
  return body;
}

export const api = {
  templates: () => request('/templates'),
  webhooks: () => request('/webhooks'),
  saveWebhook: (data) => request('/webhooks', { method: 'PUT', body: JSON.stringify(data) }),
  rules: () => request('/rules'),
  rule: (id) => request(`/rules/${id}`),
  createRule: (data) => request('/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateRule: (id, data) => request(`/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRule: (id) => request(`/rules/${id}`, { method: 'DELETE' }),
  enableRule: (id) => request(`/rules/${id}/enable`, { method: 'POST' }),
  disableRule: (id) => request(`/rules/${id}/disable`, { method: 'POST' }),
  testRule: (id, sendAlert = true) =>
    request(`/rules/${id}/test`, { method: 'POST', body: JSON.stringify({ sendAlert }) }),
};
