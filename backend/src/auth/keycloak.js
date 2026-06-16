import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '../config.js';
import { prisma } from '../db/prisma.js';

// Lazily-built remote JWK set fetched from Keycloak's OIDC discovery endpoint.
const jwks = createRemoteJWKSet(
  new URL(`${config.oidc.issuer}/protocol/openid-connect/certs`)
);

function extractRoles(payload) {
  const realmRoles = payload?.realm_access?.roles || [];
  const clientRoles = payload?.resource_access?.[config.oidc.audience]?.roles || [];
  return new Set([...realmRoles, ...clientRoles]);
}

// Express middleware: verifies the Bearer token, attaches req.user and roles,
// and upserts a local User row used for ownership / audit references.
export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing bearer token' });

    const { payload } = await jwtVerify(token, jwks, {
      issuer: config.oidc.issuer,
      // Keycloak access tokens carry the client id in `azp`; audience can vary,
      // so we validate issuer + signature and check roles for authorization.
    });

    const roles = extractRoles(payload);
    const user = await prisma.user.upsert({
      where: { subject: payload.sub },
      update: { email: payload.email, username: payload.preferred_username },
      create: {
        subject: payload.sub,
        email: payload.email,
        username: payload.preferred_username,
      },
    });

    req.user = user;
    req.roles = roles;
    req.isAdmin = roles.has(config.oidc.adminRole);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token', detail: err.message });
  }
}
