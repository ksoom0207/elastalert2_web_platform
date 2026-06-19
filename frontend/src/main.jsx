import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { initKeycloak } from './auth/keycloak.js';
import App from './App.jsx';
import './index.css';

function fatal(message) {
  document.getElementById('root').innerHTML =
    `<div style="max-width:480px;margin:80px auto;border:1px solid #e4e4e7;border-radius:12px;background:#fff;box-shadow:0 4px 8px -2px rgba(16,24,40,0.1);overflow:hidden;font-family:'Inter',system-ui,sans-serif">
      <div style="background:#fef2f2;color:#dc2626;font-weight:700;font-size:14px;padding:14px 20px;border-bottom:1px solid #fecaca">⚠ ElastAlert² — 초기화 실패</div>
      <div style="padding:20px">
        <p style="font-size:14px;color:#18181b;margin-bottom:8px">${message}</p>
        <p style="font-size:12px;color:#a1a1aa;font-family:'JetBrains Mono',monospace">KEYCLOAK_URL 이 브라우저에서 접근 가능한지, realm/client 설정이 맞는지 확인하세요.</p>
      </div>
    </div>`;
}

initKeycloak()
  .then((authenticated) => {
    if (!authenticated) {
      fatal('인증되지 않았습니다.');
      return;
    }
    createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </React.StrictMode>
    );
  })
  .catch((err) => fatal(err?.message || String(err)));
