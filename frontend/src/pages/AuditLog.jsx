import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.audit(200).then(setLogs).catch((e) => setMsg(e.message));
  }, []);

  return (
    <div className="page-90s">
      <div className="page-header-90s">
        <div>
          <h1>📜 감사 로그</h1>
          <div className="subtitle">누가 · 언제 · 무엇을 변경했는지 기록합니다.</div>
        </div>
      </div>

      {msg && <div className="status90 status90-err">{msg}</div>}

      <div className="win-card">
        <div className="win-card-title">📊 Activity Log — {logs.length} records</div>
        <div className="win-card-body" style={{ padding: 0 }}>
          <table className="table90">
            <thead>
              <tr>
                <th>시각</th>
                <th>사용자</th>
                <th>액션</th>
                <th>대상 Rule</th>
                <th>상세</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontFamily: '"Courier New", monospace', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td>{l.user?.username || l.user?.email || '—'}</td>
                  <td><span className="badge90 badge90-action">{l.action}</span></td>
                  <td>{l.rule?.name || '—'}</td>
                  <td><code>{JSON.stringify(l.detail)}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && !msg && <div className="empty90">기록이 없습니다.</div>}
        </div>
      </div>
    </div>
  );
}
