import { config } from '../config.js';

// Require a specific realm/client role.
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.roles?.has(role)) {
      return res.status(403).json({ error: `Requires role: ${role}` });
    }
    next();
  };
}

export const requireAdmin = requireRole(config.oidc.adminRole);

// Developers may only mutate rules they own; admins may touch anything.
export function requireOwnerOrAdmin(getOwnerId) {
  return async (req, res, next) => {
    if (req.isAdmin) return next();
    const ownerId = await getOwnerId(req);
    if (ownerId && ownerId === req.user.id) return next();
    return res.status(403).json({ error: 'Not the owner of this rule' });
  };
}
