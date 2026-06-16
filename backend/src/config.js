// Centralised runtime configuration, sourced from environment variables.
export const config = {
  port: parseInt(process.env.PORT || '4000', 10),

  // Directory shared (as a Docker volume) with the ElastAlert2 container.
  // Active rules are rendered here; ElastAlert2 picks them up every `run_every`.
  rulesFolder: process.env.RULES_FOLDER || '/data/rules',

  // Keycloak / OIDC settings used to validate incoming access tokens.
  oidc: {
    issuer: process.env.OIDC_ISSUER || 'http://keycloak:8080/realms/elastalert',
    audience: process.env.OIDC_AUDIENCE || 'elastalert-web',
    // Role claim location: Keycloak puts realm roles under realm_access.roles.
    adminRole: process.env.OIDC_ADMIN_ROLE || 'admin',
    developerRole: process.env.OIDC_DEVELOPER_ROLE || 'developer',
  },

  // How the dry-run test alarm is executed. We exec elastalert-test-rule inside
  // the ElastAlert2 container so it reuses the admin-managed config.yaml + ES creds.
  test: {
    containerName: process.env.ELASTALERT_CONTAINER || 'elastalert2',
    // Path to config.yaml *inside* the ElastAlert2 container.
    configPath: process.env.ELASTALERT_CONFIG || '/opt/elastalert/config.yaml',
    timeoutMs: parseInt(process.env.TEST_TIMEOUT_MS || '60000', 10),
  },

  corsOrigin: process.env.CORS_ORIGIN || '*',
};
