import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

export default function RuleList() {
  const [rules, setRules] = useState([]);
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const load = () => api.rules().then(setRules).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, []);

  const toggle = async (r) => {
    try {
      await (r.enabled ? api.disableRule(r.id) : api.enableRule(r.id));
      load();
    } catch (e) { setMsg(e.message); }
  };

  const remove = async (r) => {
    if (!confirm(`${r.name} 삭제할까요?`)) return;
    await api.deleteRule(r.id);
    load();
  };

  const test = async (r) => {
    setMsg(`테스트 실행 중: ${r.name} ...`);
    try {
      const res = await api.testRule(r.id, true);
      setMsg(`테스트 ${res.ok ? '성공' : '실패'} (exit ${res.code})\n${res.stdout || res.stderr}`);
    } catch (e) { setMsg(e.message); }
  };

  return (
    <div>
      <div style={{ display: 'flex', margin: '16px 0' }}>
        <h3 style={{ marginRight: 'auto' }}>Rules</h3>
        <button onClick={() => navigate('/rules/new')}>+ 새 Rule</button>
      </div>
      {msg && <pre style={{ background: '#f5f5f5', padding: 8, whiteSpace: 'pre-wrap' }}>{msg}</pre>}
      <table width="100%" cellPadding="6" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
            <th>이름</th><th>템플릿</th><th>Alerter</th><th>상태</th><th>소유자</th><th>액션</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
              <td><Link to={`/rules/${r.id}`}>{r.name}</Link></td>
              <td>{r.template}</td>
              <td>{r.alerter}</td>
              <td>{r.enabled ? '🟢 활성' : '⚪ 비활성'}</td>
              <td>{r.owner?.username || '-'}</td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => toggle(r)}>{r.enabled ? '비활성화' : '활성화'}</button>
                <button onClick={() => test(r)}>테스트</button>
                <button onClick={() => remove(r)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
