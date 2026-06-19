import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { initKeycloak } from './auth/keycloak.js';
import App from './App.jsx';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import './index.css';

function fatal(message) {
  document.getElementById('root').innerHTML =
    `<div style="max-width:560px;margin:18vh auto;padding:32px;border-radius:14px;background:#fff;box-shadow:0 8px 30px rgba(15,27,38,0.12);font-family:'IBM Plex Sans',sans-serif">
      <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:22px;letter-spacing:-0.02em">ElastAlert² · 초기화 실패</div>
      <p style="color:#5d6b7c;margin-top:12px">${message}</p>
      <p style="color:#8a97a8;font-size:13px">KEYCLOAK_URL 이 브라우저에서 접근 가능한지, realm/client 설정이 맞는지 확인하세요.</p>
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
