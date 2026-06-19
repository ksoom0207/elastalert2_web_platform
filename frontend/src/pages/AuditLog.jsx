import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

// Admin: all activity. Developer: only their own actions.
export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.audit(200).then(setLogs).catch((e) => setMsg(e.message));
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">감사 로그</h1>
          <p className="page-sub">누가 · 언제 · 무엇을 변경했는지 기록합니다.</p>
        </div>
      </div>

      {msg && <div className="status status-err">{msg}</div>}

      <table className="table">
        <thead>
          <tr>
            <th>시각</th><th>사용자</th><th>액션</th><th>대상 Rule</th><th>상세</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td>{new Date(l.createdAt).toLocaleString()}</td>
              <td>{l.user?.username || l.user?.email || '—'}</td>
              <td><span className="badge badge-on">{l.action}</span></td>
              <td>{l.rule?.name || '—'}</td>
              <td><code>{JSON.stringify(l.detail)}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
      {logs.length === 0 && !msg && <p className="empty">기록이 없습니다.</p>}
    </div>
  );
}
