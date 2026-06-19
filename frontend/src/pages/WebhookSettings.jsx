import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

// Admin-only: set default webhook URLs (e.g. the mattermost infra webhook).
export default function WebhookSettings() {
  const [form, setForm] = useState({ slack: '', mattermost: '' });
  const [msg, setMsg] = useState('');

  const load = () =>
    api.webhooks().then((s) => {
      const next = { slack: '', mattermost: '' };
      s.forEach((x) => { if (x.webhookUrl) next[x.type] = x.webhookUrl; });
      setForm(next);
    });
  useEffect(() => { load(); }, []);

  const save = async (type) => {
    try {
      await api.saveWebhook({ type, webhookUrl: form[type] });
      setMsg(`${type} webhook 저장됨 ✓`);
      load();
    } catch (e) { setMsg(e.message); }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Webhook 설정</h1>
          <p className="page-sub">developer 가 override 를 비워두면 여기 기본값을 사용합니다.</p>
        </div>
      </div>

      {msg && <div className="status">{msg}</div>}

      <div className="form">
        <div className="section-title">기본 Webhook</div>
        {['mattermost', 'slack'].map((type) => (
          <div className="field" key={type}>
            <label>{type}</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={form[type]}
                onChange={(e) => setForm((f) => ({ ...f, [type]: e.target.value }))}
                placeholder="https://…/hooks/xxxx" />
              <button className="btn" onClick={() => save(type)}>저장</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
