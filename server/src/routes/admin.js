import { Router } from 'express';
import { User } from '../models/User.js';
import { Task } from '../models/Task.js';
import { authRequired, attachUser, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get(
  '/admin/users',
  authRequired,
  attachUser,
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const users = await User.find().select('name email role createdAt').sort({ createdAt: -1 }).lean();
    return res.success({ users }, 'Users loaded');
  })
);

router.get(
  '/admin/tasks',
  authRequired,
  attachUser,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { status, priority } = req.query;
    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tasks = await Task.find(query)
      .sort({ updatedAt: -1 })
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email role')
      .lean();

    return res.success({ tasks }, 'Tasks loaded');
  })
);

export default router;
