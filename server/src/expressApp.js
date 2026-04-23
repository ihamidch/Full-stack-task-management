import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import boardRoutes from './routes/boards.js';
import listRoutes from './routes/lists.js';
import taskRoutes from './routes/tasks.js';
import { attachResponseHelpers } from './utils/response.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp({ io = null } = {}) {
  const app = express();
  const rawOrigins = process.env.CLIENT_URL || 'http://localhost:5173';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowAllOrigins = String(process.env.CORS_ALLOW_ALL || '').toLowerCase() === 'true';

  app.set('io', io);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowAllOrigins) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('CORS origin not allowed'));
      },
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(attachResponseHelpers);

  app.get('/', (req, res) => {
    res.status(200).json({
      ok: true,
      service: 'saas-task-api',
      hint: 'API routes are under /api/* (start with /api/health).',
    });
  });

  app.get(['/favicon.ico', '/favicon.png'], (_req, res) => {
    res.status(204).end();
  });

  app.get('/api/health', (req, res) => {
    res.success({ ok: true, service: 'saas-task-api' }, 'Service healthy');
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', authRoutes);
  app.use('/api', adminRoutes);
  app.use('/api', boardRoutes);
  app.use('/api', listRoutes);
  app.use('/api', taskRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
