import { useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Marquee from 'react-fast-marquee';
import { keycloak, hasRole } from './auth/keycloak.js';
import { useTheme } from './theme/ThemeContext.jsx';
import ThemeSwitcher from './theme/ThemeSwitcher.jsx';
import Minesweeper from './components/Minesweeper.jsx';
import RuleList from './pages/RuleList.jsx';
import RuleEditor from './pages/RuleEditor.jsx';
import WebhookSettings from './pages/WebhookSettings.jsx';
import AuditLog from './pages/AuditLog.jsx';

export default function App() {
  const isAdmin = hasRole('admin');
  const username = keycloak.tokenParsed?.preferred_username || 'user';
  const location = useLocation();
  const { theme } = useTheme();
  const [showMines, setShowMines] = useState(false);

  const pages = {
    '/': 'Rules',
    '/audit': '감사 로그',
  };
  if (isAdmin) pages['/webhooks'] = 'Webhook 설정';

  const currentPage = Object.entries(pages).find(
    ([path]) => location.pathname === path || location.pathname.startsWith('/rules')
  );

  return (
    <div className="win95-app">
      {/* Title Bar */}
      <div className="win95-titlebar">
        <div className="win95-titlebar-icon">EA</div>
        <div className="win95-titlebar-text">
          ElastAlert² Rule Console — [{username}]
        </div>
        <ThemeSwitcher />
        <div className="win95-titlebar-btns">
          <button className="win95-titlebar-btn" title="Minimize" onClick={() => theme === 'retro' && setShowMines(true)}>_</button>
          <button className="win95-titlebar-btn" title="Maximize">□</button>
          <button className="win95-titlebar-btn" onClick={() => keycloak.logout()} title="로그아웃">✕</button>
        </div>
      </div>

      {/* Menu Bar */}
      <div className="win95-menubar">
        {Object.entries(pages).map(([path, label]) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `win95-menu-item${isActive || (path === '/' && location.pathname.startsWith('/rules')) ? ' active' : ''}`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Marquee */}
      <div className="marquee-bar">
        <Marquee speed={45} gradient={false} pauseOnHover>
          <span className="hot">★ HOT ★</span>
          <span> ElastAlert2 룰 관리 플랫폼에 오신 것을 환영합니다! </span>
          <span className="grn">▶ K8s ERROR 로그</span>
          <span className="wht"> | </span>
          <span className="cyn">▶ APM 500 에러</span>
          <span className="wht"> | </span>
          <span className="grn">▶ 서버 메트릭 알람</span>
          <span className="wht"> | </span>
          <span className="hot">▶ Custom YAML</span>
          <span> — Slack & Mattermost 지원 — </span>
          <span className="cyn">지금 바로 룰을 만들어 보세요!</span>
          <span>{"                    "}</span>
        </Marquee>
      </div>

      {/* Content */}
      <div className="win95-content">
        <Routes>
          <Route path="/" element={<RuleList />} />
          <Route path="/rules/new" element={<RuleEditor />} />
          <Route path="/rules/:id" element={<RuleEditor />} />
          <Route path="/audit" element={<AuditLog />} />
          {isAdmin && <Route path="/webhooks" element={<WebhookSettings />} />}
        </Routes>
      </div>

      {/* Status Bar */}
      <div className="win95-statusbar">
        <div className="statusbar-cell">
          Ready — {isAdmin ? 'Administrator' : 'Developer'} Mode
        </div>
        <div className="statusbar-cell">
          <span className="hit-counter">
            VISITORS: {String(Math.floor(Math.random() * 9000 + 1000)).padStart(6, '0')}
          </span>
        </div>
        <div className="statusbar-cell" style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <div className="color-squares">
            {['#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff'].map(c => (
              <div key={c} className="color-sq" style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>

      {showMines && <Minesweeper onClose={() => setShowMines(false)} />}
    </div>
  );
}
