import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

// Admin-only: set default webhook URLs (e.g. the mattermost infra webhook).
export default function WebhookSettings() {
  const [settings, setSettings] = useState([]);
  const [form, setForm] = useState({ slack: '', mattermost: '' });
  const [msg, setMsg] = useState('');

  const load = () =>
    api.webhooks().then((s) => {
      setSettings(s);
      const next = { slack: '', mattermost: '' };
      s.forEach((x) => { if (x.webhookUrl) next[x.type] = x.webhookUrl; });
      setForm(next);
    });
  useEffect(() => { load(); }, []);

  const save = async (type) => {
    try {
      await api.saveWebhook({ type, webhookUrl: form[type] });
      setMsg(`${type} webhook 저장됨`);
      load();
    } catch (e) { setMsg(e.message); }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <h3>기본 Webhook 설정 (관리자)</h3>
      {msg && <p style={{ color: '#080' }}>{msg}</p>}
      {['mattermost', 'slack'].map((type) => (
        <div key={type} style={{ margin: '12px 0', display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ width: 120 }}>{type}</label>
          <input style={{ flex: 1 }} value={form[type]}
            onChange={(e) => setForm((f) => ({ ...f, [type]: e.target.value }))}
            placeholder="https://.../hooks/xxxx" />
          <button onClick={() => save(type)}>저장</button>
        </div>
      ))}
      <p style={{ color: '#666' }}>
        developer는 rule별 webhook override를 비워두면 여기 설정된 기본값을 사용합니다.
      </p>
    </div>
  );
}
