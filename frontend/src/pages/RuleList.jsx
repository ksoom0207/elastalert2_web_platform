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
    say(`C:\\ELASTALERT\\TEST.EXE — ${r.name} 실행 중...`);
    try {
      const res = await api.testRule(r.id, true);
      say(`테스트 ${res.ok ? '성공' : '실패'} (exit ${res.code})\n${res.stdout || res.stderr}`, !res.ok);
    } catch (e) { say(e.message, true); }
  };

  return (
    <div className="page-90s">
      <div className="page-header-90s">
        <div>
          <h1><span className="text-rainbow">Rules</span></h1>
          <div className="subtitle">알림 룰을 만들고 활성화 · 테스트합니다.</div>
        </div>
        <button className="btn90 btn90-primary" onClick={() => navigate('/rules/new')}>
          ✚ 새 Rule
        </button>
      </div>

      {msg && <div className={`status90 ${err ? 'status90-err' : ''}`}>{msg}</div>}

      <div className="construction-stripe">
        ⚠ UNDER CONSTRUCTION ⚠ — 룰을 만들고 Slack / Mattermost 로 알림을 보내세요!
      </div>

      <div className="win-card">
        <div className="win-card-title">📋 Rule Database — {rules.length} entries</div>
        <div className="win-card-body" style={{ padding: 0 }}>
          <table className="table90">
            <thead>
              <tr>
                <th>이름</th>
                <th>템플릿</th>
                <th>Alerter</th>
                <th>상태</th>
                <th>소유자</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td><Link to={`/rules/${r.id}`}>{r.name}</Link></td>
                  <td style={{ fontFamily: '"Courier New", monospace', fontSize: 12 }}>{r.template}</td>
                  <td>{r.alerter}</td>
                  <td>
                    <span className={`badge90 ${r.enabled ? 'badge90-on' : 'badge90-off'}`}>
                      {r.enabled ? 'ON' : 'OFF'}
                    </span>
                  </td>
                  <td>{r.owner?.username || '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn90 btn90-sm" onClick={() => toggle(r)}>
                        {r.enabled ? '비활성화' : '활성화'}
                      </button>
                      <button className="btn90 btn90-sm btn90-success" onClick={() => test(r)}>
                        테스트
                      </button>
                      <button className="btn90 btn90-sm btn90-danger" onClick={() => remove(r)}>
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rules.length === 0 && !err && (
            <div className="empty90">
              아직 룰이 없습니다. <Link to="/rules/new">✚ 새 Rule</Link> 을 만들어 보세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
