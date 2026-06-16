import Keycloak from 'keycloak-js';

// Configured via Vite env vars at build/runtime.
export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'elastalert',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT || 'elastalert-web',
});

export async function initKeycloak() {
  const authenticated = await keycloak.init({
    onLoad: 'login-required',
    pkceMethod: 'S256',
    checkLoginIframe: false,
  });
  // Keep the token fresh.
  setInterval(() => keycloak.updateToken(60).catch(() => keycloak.login()), 30000);
  return authenticated;
}

export function hasRole(role) {
  return keycloak.hasRealmRole(role) || keycloak.hasResourceRole(role);
}
