import { useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { keycloak, hasRole } from './auth/keycloak.js';
import RuleList from './pages/RuleList.jsx';
import RuleEditor from './pages/RuleEditor.jsx';
import WebhookSettings from './pages/WebhookSettings.jsx';
import AuditLog from './pages/AuditLog.jsx';

const NAV = [
  { to: '/', label: 'Rules', icon: '📋', end: true },
  { to: '/audit', label: '감사 로그', icon: '📜', end: false },
  { to: '/webhooks', label: 'Webhook 설정', icon: '🔗', end: false, adminOnly: true },
];

export default function App() {
  const isAdmin = hasRole('admin');
  const username = keycloak.tokenParsed?.preferred_username || 'user';
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  const links = NAV.filter((n) => !n.adminOnly || isAdmin);

  const isActive = (n) =>
    n.end
      ? location.pathname === '/' || location.pathname.startsWith('/rules')
      : location.pathname === n.to || location.pathname.startsWith(n.to);

  return (
    <div className="app-shell">
      <div
        className={`sidebar-backdrop ${navOpen ? 'open' : ''}`}
        onClick={() => setNavOpen(false)}
      />

      <aside className={`sidebar ${navOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">EA</div>
          <div>
            <div className="sidebar-brand-name">ElastAlert²</div>
            <div className="sidebar-brand-sub">Rule Console</div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Menu</div>
          <nav className="sidebar-nav">
            {links.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => setNavOpen(false)}
                className={() => `sidebar-link${isActive(n) ? ' active' : ''}`}
              >
                <span className="sidebar-link-icon">{n.icon}</span>
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{username.slice(0, 2)}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{username}</div>
              <div className="sidebar-user-role">{isAdmin ? 'Administrator' : 'Developer'}</div>
            </div>
            <button className="sidebar-logout" title="로그아웃" onClick={() => keycloak.logout()}>
              ⏻
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="mobile-topbar">
          <button className="mobile-menu-btn" onClick={() => setNavOpen(true)}>☰</button>
          <div className="sidebar-brand-name">ElastAlert²</div>
        </div>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<RuleList />} />
            <Route path="/rules/new" element={<RuleEditor />} />
            <Route path="/rules/:id" element={<RuleEditor />} />
            <Route path="/audit" element={<AuditLog />} />
            {isAdmin && <Route path="/webhooks" element={<WebhookSettings />} />}
          </Routes>
        </main>
      </div>
    </div>
  );
}
