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
    <div style={{ marginTop: 16 }}>
      <h3>감사 로그</h3>
      {msg && <p style={{ color: '#c00' }}>{msg}</p>}
      <table width="100%" cellPadding="6" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
            <th>시각</th><th>사용자</th><th>액션</th><th>대상 Rule</th><th>상세</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
              <td>{new Date(l.createdAt).toLocaleString()}</td>
              <td>{l.user?.username || l.user?.email || '-'}</td>
              <td>{l.action}</td>
              <td>{l.rule?.name || '-'}</td>
              <td><code style={{ fontSize: 12 }}>{JSON.stringify(l.detail)}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
      {logs.length === 0 && !msg && <p style={{ color: '#666' }}>기록이 없습니다.</p>}
    </div>
  );
}
