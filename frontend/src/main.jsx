import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { initKeycloak } from './auth/keycloak.js';
import { ThemeProvider } from './theme/ThemeContext.jsx';
import App from './App.jsx';
import './index.css';
import './theme/swiss.css';
import './theme/cyberpunk.css';

function fatal(message) {
  document.getElementById('root').innerHTML =
    `<div style="max-width:560px;margin:80px auto;border:2px solid;border-color:#fff #808080 #808080 #fff;box-shadow:inset -1px -1px 0 #404040,inset 1px 1px 0 #dfdfdf;background:#c0c0c0">
      <div style="background:linear-gradient(to right,#000080,#1084d0);color:#fff;font-family:'Arial Black',Impact,sans-serif;font-weight:900;font-size:14px;padding:4px 8px">⚠ ElastAlert² — Error</div>
      <div style="border:2px solid;border-color:#808080 #fff #fff #808080;margin:4px;padding:16px;background:#ffffcc;font-family:'MS Sans Serif','Segoe UI',Tahoma,sans-serif">
        <p style="font-weight:700;margin-bottom:8px">초기화 실패</p>
        <p style="font-size:13px">${message}</p>
        <p style="font-size:12px;color:#808080;margin-top:10px;font-family:'Courier New',monospace">KEYCLOAK_URL 이 브라우저에서 접근 가능한지, realm/client 설정이 맞는지 확인하세요.</p>
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
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      </React.StrictMode>
    );
  })
  .catch((err) => fatal(err?.message || String(err)));
