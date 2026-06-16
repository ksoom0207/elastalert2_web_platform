import { Router } from 'express';
import { authenticate } from '../auth/keycloak.js';
import { listTemplates } from '../services/templates.js';

const router = Router();

// Expose template definitions (incl. form field schemas) to the frontend.
router.get('/', authenticate, (req, res) => {
  res.json(listTemplates());
});

export default router;
