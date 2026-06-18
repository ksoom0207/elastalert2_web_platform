import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { initKeycloak } from './auth/keycloak.js';
import App from './App.jsx';
import './index.css';

function fatal(message) {
  document.getElementById('root').innerHTML =
    `<div style="max-width:640px;margin:80px auto;padding:24px;border:1px solid #e2e6ec;border-radius:8px;background:#fff">
      <h3>로그인/초기화 실패</h3>
      <p style="color:#647084">${message}</p>
      <p style="color:#647084">KEYCLOAK_URL 이 브라우저에서 접근 가능한지, realm/client 설정이 맞는지 확인하세요.</p>
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
