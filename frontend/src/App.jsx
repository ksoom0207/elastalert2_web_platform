import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { keycloak, hasRole } from './auth/keycloak.js';
import RuleList from './pages/RuleList.jsx';
import RuleEditor from './pages/RuleEditor.jsx';
import WebhookSettings from './pages/WebhookSettings.jsx';
import AuditLog from './pages/AuditLog.jsx';

export default function App() {
  const navigate = useNavigate();
  const isAdmin = hasRole('admin');
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 960, margin: '0 auto', padding: 16 }}>
      <header style={{ display: 'flex', gap: 16, alignItems: 'center', borderBottom: '1px solid #ddd', paddingBottom: 8 }}>
        <h2 style={{ marginRight: 'auto' }}>ElastAlert2 Rule 관리</h2>
        <Link to="/">Rules</Link>
        <Link to="/audit">감사 로그</Link>
        {isAdmin && <Link to="/webhooks">Webhook 설정</Link>}
        <span style={{ color: '#666' }}>{keycloak.tokenParsed?.preferred_username}</span>
        <button onClick={() => keycloak.logout()}>로그아웃</button>
      </header>
      <Routes>
        <Route path="/" element={<RuleList />} />
        <Route path="/rules/new" element={<RuleEditor />} />
        <Route path="/rules/:id" element={<RuleEditor />} />
        <Route path="/audit" element={<AuditLog />} />
        {isAdmin && <Route path="/webhooks" element={<WebhookSettings />} />}
      </Routes>
    </div>
  );
}
