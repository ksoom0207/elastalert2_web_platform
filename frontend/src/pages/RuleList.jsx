import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

export default function RuleList() {
  const [rules, setRules] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState(false);
  const navigate = useNavigate();

  const load = () => api.rules().then(setRules).catch((e) => say(e.message, true));
  useEffect(() => { load(); }, []);

  const say = (m, isErr = false) => { setMsg(m); setErr(isErr); };

  const toggle = async (r) => {
    try {
      await (r.enabled ? api.disableRule(r.id) : api.enableRule(r.id));
      load();
    } catch (e) { say(e.message, true); }
  };

  const remove = async (r) => {
    if (!confirm(`${r.name} 삭제할까요?`)) return;
    await api.deleteRule(r.id);
    load();
  };

  const test = async (r) => {
    say(`테스트 실행 중: ${r.name} …`);
    try {
      const res = await api.testRule(r.id, true);
      say(`테스트 ${res.ok ? '성공 ✓' : '실패 ✗'} (exit ${res.code})\n${res.stdout || res.stderr}`, !res.ok);
    } catch (e) { say(e.message, true); }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Rules</h1>
          <p className="page-sub">알림 룰을 만들고 활성화 · 테스트합니다.</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/rules/new')}>+ 새 Rule</button>
      </div>

      {msg && <div className={`status ${err ? 'status-err' : ''}`}>{msg}</div>}

      <table className="table">
        <thead>
          <tr>
            <th>이름</th><th>템플릿</th><th>Alerter</th><th>상태</th><th>소유자</th><th>액션</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id}>
              <td><Link to={`/rules/${r.id}`}>{r.name}</Link></td>
              <td>{r.template}</td>
              <td>{r.alerter}</td>
              <td><span className={`badge ${r.enabled ? 'badge-on' : 'badge-off'}`}>{r.enabled ? '활성' : '비활성'}</span></td>
              <td>{r.owner?.username || '—'}</td>
              <td>
                <div className="row-actions">
                  <button className="btn btn-sm" onClick={() => toggle(r)}>{r.enabled ? '비활성화' : '활성화'}</button>
                  <button className="btn btn-sm" onClick={() => test(r)}>테스트</button>
                  <button className="btn-danger btn-sm" onClick={() => remove(r)}>삭제</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rules.length === 0 && !err && <p className="empty">아직 룰이 없습니다. <Link to="/rules/new">새 Rule</Link> 을 만들어 보세요.</p>}
    </div>
  );
}
