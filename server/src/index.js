import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import boardRoutes from './routes/boards.js';
import listRoutes from './routes/lists.js';
import taskRoutes from './routes/tasks.js';
import { getBoardIfMember } from './utils/boardAccess.js';

const app = express();
const httpServer = http.createServer(app);

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(httpServer, {
  cors: { origin: clientUrl, credentials: true },
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  socket.on('joinBoard', async (boardId, cb) => {
    try {
      const { ok } = await getBoardIfMember(boardId, socket.userId);
      if (!ok) {
        if (typeof cb === 'function') cb({ error: 'Forbidden' });
        return;
      }
      socket.join(`board:${boardId}`);
      if (typeof cb === 'function') cb({ ok: true });
    } catch {
      if (typeof cb === 'function') cb({ error: 'Failed' });
    }
  });

  socket.on('leaveBoard', (boardId) => {
    socket.leave(`board:${boardId}`);
  });
});

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
app.use('/api', boardRoutes);
app.use('/api', listRoutes);
app.use('/api', taskRoutes);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`API listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });
