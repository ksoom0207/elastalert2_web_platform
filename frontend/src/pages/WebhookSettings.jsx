import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

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
      setMsg(`${type} webhook 저장 완료!`);
      load();
    } catch (e) { setMsg(e.message); }
  };

  return (
    <div className="page-90s">
      <div className="page-header-90s">
        <div>
          <h1>⚙ Webhook 설정</h1>
          <div className="subtitle">관리자 전용 — developer가 override를 비워두면 여기 기본값을 사용합니다.</div>
        </div>
      </div>

      {msg && <div className="status90">{msg}</div>}

      <div className="win-card">
        <div className="win-card-title">🔗 기본 Webhook URL</div>
        <div className="win-card-body win-card-body-yellow">
          {['mattermost', 'slack'].map((type) => (
            <div className="field90" key={type}>
              <label>{type.toUpperCase()}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={form[type]}
                  onChange={(e) => setForm((f) => ({ ...f, [type]: e.target.value }))}
                  placeholder="https://…/hooks/xxxx"
                  style={{ maxWidth: 340 }}
                />
                <button className="btn90 btn90-success btn90-sm" onClick={() => save(type)}>
                  저장
                </button>
              </div>
            </div>
          ))}
          <hr className="hr-groove" />
          <p style={{ fontSize: 12, color: '#808080', fontFamily: '"Courier New", monospace' }}>
            C:\ELASTALERT\WEBHOOK.CFG — developer 는 rule별 webhook override를 비워두면 여기 설정된 기본값을 사용합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
