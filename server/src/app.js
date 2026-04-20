import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import boardRoutes from './routes/boards.js';
import listRoutes from './routes/lists.js';
import taskRoutes from './routes/tasks.js';

export function createApp({ io = null } = {}) {
  const app = express();
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  app.set('io', io);
  app.use(
    cors({
      origin: clientUrl,
      credentials: true,
    })
  );
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'saas-task-api' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', authRoutes);
  app.use('/api', boardRoutes);
  app.use('/api', listRoutes);
  app.use('/api', taskRoutes);

  return app;
}
