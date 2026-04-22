import 'dotenv/config';
import { connectDB } from '../src/config/db.js';
import { createApp } from '../src/expressApp.js';

const app = createApp();
let dbReady;

export default async function handler(req, res) {
  try {
    dbReady = dbReady || connectDB();
    await dbReady;
    return app(req, res);
  } catch (error) {
    console.error('Vercel handler error', error);
    return res.status(500).json({ message: 'Server initialization failed' });
  }
}
