import { Routes, Route, NavLink } from 'react-router-dom';
import { keycloak, hasRole } from './auth/keycloak.js';
import RuleList from './pages/RuleList.jsx';
import RuleEditor from './pages/RuleEditor.jsx';
import WebhookSettings from './pages/WebhookSettings.jsx';
import AuditLog from './pages/AuditLog.jsx';

export default function App() {
  const isAdmin = hasRole('admin');
  const username = keycloak.tokenParsed?.preferred_username || 'user';
  const initial = username.charAt(0).toUpperCase();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">EA</span>
          <div>
            <div className="brand-name">ElastAlert²</div>
            <div className="brand-sub">Rule Console</div>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/" end className="nav-item"><span className="nav-dot" />Rules</NavLink>
          <NavLink to="/audit" className="nav-item"><span className="nav-dot" />감사 로그</NavLink>
          {isAdmin && (
            <NavLink to="/webhooks" className="nav-item"><span className="nav-dot" />Webhook 설정</NavLink>
          )}
        </nav>

        <div className="user">
          <div className="avatar">{initial}</div>
          <div className="user-meta">
            <div className="user-name">{username}</div>
            <div className="user-role">{isAdmin ? 'admin' : 'developer'}</div>
          </div>
          <button className="btn-ghost" onClick={() => keycloak.logout()}>로그아웃</button>
        </div>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<RuleList />} />
          <Route path="/rules/new" element={<RuleEditor />} />
          <Route path="/rules/:id" element={<RuleEditor />} />
          <Route path="/audit" element={<AuditLog />} />
          {isAdmin && <Route path="/webhooks" element={<WebhookSettings />} />}
        </Routes>
      </main>
    </div>
  );
}
