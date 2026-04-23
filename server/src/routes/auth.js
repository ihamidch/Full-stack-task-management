import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Task } from '../models/Task.js';
import { authRequired, attachUser } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

const router = Router();

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function getInitialRole(email) {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email) ? 'admin' : 'user';
}

function serializeUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const normalizedEmail = String(email || '').toLowerCase().trim();
    const normalizedName = String(name || '').trim();
    if (!normalizedName || !normalizedEmail || !password) {
      throw new AppError('Name, email, and password are required', 400);
    }
    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      throw new AppError('Email already registered', 409);
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hash,
      role: getInitialRole(normalizedEmail),
    });
    const token = signToken(user._id);
    return res.success({ token, user: serializeUser(user) }, 'Registration successful', 201);
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').toLowerCase().trim();
    if (!normalizedEmail || !password) {
      throw new AppError('Email and password are required', 400);
    }
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError('Invalid email or password', 401);
    }
    const token = signToken(user._id);
    return res.success({ token, user: serializeUser(user) }, 'Login successful');
  })
);

router.get(
  '/me',
  authRequired,
  attachUser,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('User not found', 404);
    }
    return res.success({ user: serializeUser(req.user) }, 'User loaded');
  })
);

router.get(
  '/users',
  authRequired,
  attachUser,
  asyncHandler(async (req, res) => {
    if (req.user?.role !== 'admin') {
      throw new AppError('Forbidden', 403);
    }
    const users = await User.find().select('name email role createdAt').sort({ createdAt: -1 }).lean();
    return res.success({ users }, 'Users loaded');
  })
);

router.get(
  '/tasks',
  authRequired,
  attachUser,
  asyncHandler(async (req, res) => {
    const query = req.user?.role === 'admin' ? {} : { createdBy: req.userId };
    const tasks = await Task.find(query)
      .sort({ updatedAt: -1 })
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email role')
      .lean();
    return res.success({ tasks }, 'Tasks loaded');
  })
);

export default router;
