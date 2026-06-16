import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import health from './routes/health.js';
import templates from './routes/templates.js';
import webhooks from './routes/webhooks.js';
import rules from './routes/rules.js';
import audit from './routes/audit.js';
import { syncAll } from './services/ruleSync.js';

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

app.use(health);
app.use('/api/templates', templates);
app.use('/api/webhooks', webhooks);
app.use('/api/rules', rules);
app.use('/api/audit', audit);

app.use(errorHandler);

async function start() {
  // Reconcile rules_folder with DB so files match enabled state on boot.
  try {
    await syncAll();
  } catch (err) {
    console.error('Initial rule sync failed:', err.message);
  }
  app.listen(config.port, () => {
    console.log(`Backend listening on :${config.port}`);
  });
}

start();
