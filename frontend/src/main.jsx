import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { initKeycloak } from './auth/keycloak.js';
import App from './App.jsx';

initKeycloak().then((authenticated) => {
  if (!authenticated) return;
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
});
