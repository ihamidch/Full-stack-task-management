import { Router } from 'express';
import { Board } from '../models/Board.js';
import { List } from '../models/List.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { authRequired, attachUser } from '../middleware/auth.js';
import { assertBoardMember, getBoardIfMember } from '../utils/boardAccess.js';
import { logActivity } from '../utils/activityLogger.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

const router = Router();
router.use(authRequired, attachUser);

const DEFAULT_LISTS = ['To Do', 'In Progress', 'Done'];

async function populateBoard(boardId) {
  const lists = await List.find({ board: boardId }).sort({ position: 1 }).lean();
  const listIds = lists.map((l) => l._id);
  const tasks = await Task.find({ list: { $in: listIds } })
    .sort({ position: 1 })
    .populate('assignee', 'name email')
    .populate('createdBy', 'name email')
    .lean();

  const tasksByList = {};
  for (const t of tasks) {
    const lid = t.list.toString();
    if (!tasksByList[lid]) tasksByList[lid] = [];
    tasksByList[lid].push(t);
  }

  return {
    lists: lists.map((l) => ({
      ...l,
      tasks: tasksByList[l._id.toString()] || [],
    })),
  };
}

router.get(
  '/dashboard/stats',
  asyncHandler(async (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const boardQuery = isAdmin ? {} : { $or: [{ owner: req.userId }, { members: req.userId }] };
    const boards = await Board.find(boardQuery).select('_id').lean();
    const boardIds = boards.map((board) => board._id);

    const taskQuery = isAdmin ? {} : { board: { $in: boardIds } };
    const [totalTasks, completedTasks, inProgressTasks, todoTasks] = await Promise.all([
      Task.countDocuments(taskQuery),
      Task.countDocuments({ ...taskQuery, status: 'completed' }),
      Task.countDocuments({ ...taskQuery, status: 'in_progress' }),
      Task.countDocuments({ ...taskQuery, status: 'todo' }),
    ]);

    return res.success(
      {
        stats: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          pendingTasks: todoTasks,
          boardCount: boardIds.length,
        },
      },
      'Dashboard stats loaded'
    );
  })
);

router.get(
  '/boards',
  asyncHandler(async (req, res) => {
    const uid = req.userId;
    const query =
      req.user?.role === 'admin' ? {} : { $or: [{ owner: uid }, { members: uid }] };
    const boards = await Board.find(query)
      .sort({ updatedAt: -1 })
      .populate('owner', 'name email role')
      .lean();

    return res.success({ boards }, 'Boards loaded');
  })
);

router.post(
  '/boards',
  asyncHandler(async (req, res) => {
    const { title, description = '' } = req.body;
    if (!title?.trim()) {
      throw new AppError('Title is required', 400);
    }

    const board = await Board.create({
      title: title.trim(),
      description: String(description).trim(),
      owner: req.userId,
      members: [req.userId],
    });

    for (let i = 0; i < DEFAULT_LISTS.length; i++) {
      await List.create({
        title: DEFAULT_LISTS[i],
        board: board._id,
        position: i,
      });
    }

    await logActivity({
      boardId: board._id,
      userId: req.userId,
      action: 'board_created',
      entityType: 'Board',
      entityId: board._id,
      meta: { title: board.title },
    });

    const populated = await populateBoard(board._id);
    const io = req.app.get('io');
    io?.to?.(`board:${board._id}`)?.emit?.('board:update', {
      type: 'board_updated',
      boardId: board._id.toString(),
    });

    return res.success(
      {
        board: {
          ...board.toObject(),
          ...populated,
        },
      },
      'Board created',
      201
    );
  })
);

router.get('/boards/:boardId/activity', async (req, res) => {
  try {
    await assertBoardMember(req.params.boardId, req.userId);
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const logs = await ActivityLog.find({ board: req.params.boardId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('user', 'name email')
      .lean();

    res.json({ activity: logs });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    console.error(e);
    res.status(500).json({ message: 'Failed to load activity' });
  }
});

router.get('/boards/:boardId', async (req, res) => {
  try {
    const { board, ok } = await getBoardIfMember(req.params.boardId, req.userId);
    if (!board) return res.status(404).json({ message: 'Board not found' });
    if (!ok) return res.status(403).json({ message: 'Access denied' });

    await board.populate('owner', 'name email');
    await board.populate('members', 'name email');
    const nested = await populateBoard(board._id);

    res.json({
      board: {
        ...board.toObject(),
        ...nested,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to load board' });
  }
});

router.patch('/boards/:boardId', async (req, res) => {
  try {
    const board = await assertBoardMember(req.params.boardId, req.userId);
    const { title, description, memberEmail } = req.body;
    let message = 'Board updated';

    if (title != null) board.title = String(title).trim();
    if (description != null) board.description = String(description).trim();

    if (memberEmail?.trim()) {
      const email = memberEmail.toLowerCase().trim();
      const u = await User.findOne({ email });
      if (!u) {
        return res.status(404).json({
          message: 'No user found with this email. The user must register first.',
        });
      }
      if (board.members.some((m) => m.equals(u._id))) {
        return res.status(409).json({ message: 'This user is already a member.' });
      }
      if (u._id.equals(req.userId)) {
        return res.status(409).json({ message: 'You are already a member.' });
      }
      if (!board.members.some((m) => m.equals(u._id))) {
        board.members.push(u._id);
        message = `Member ${email} added`;
        await logActivity({
          boardId: board._id,
          userId: req.userId,
          action: 'member_added',
          entityType: 'Board',
          entityId: board._id,
          meta: { email },
        });
      }
    }

    await board.save();

    await logActivity({
      boardId: board._id,
      userId: req.userId,
      action: 'board_updated',
      entityType: 'Board',
      entityId: board._id,
      meta: { title: board.title },
    });

    const nested = await populateBoard(board._id);
    await board.populate('owner', 'name email');
    await board.populate('members', 'name email');
    const io = req.app.get('io');
    io?.to?.(`board:${board._id}`)?.emit?.('board:update', {
      type: 'board_updated',
      boardId: board._id.toString(),
    });

    res.json({
      message,
      board: {
        ...board.toObject(),
        ...nested,
      },
    });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    console.error(e);
    res.status(500).json({ message: 'Failed to update board' });
  }
});

router.delete('/boards/:boardId', async (req, res) => {
  try {
    const board = await assertBoardMember(req.params.boardId, req.userId);
    if (!board.owner.equals(req.userId)) {
      return res.status(403).json({ message: 'Only the owner can delete the board' });
    }

    const lists = await List.find({ board: board._id });
    const listIds = lists.map((l) => l._id);
    await Task.deleteMany({ board: board._id });
    await List.deleteMany({ board: board._id });
    await ActivityLog.deleteMany({ board: board._id });
    await Board.deleteOne({ _id: board._id });

    const io = req.app.get('io');
    io?.to?.(`board:${req.params.boardId}`)?.emit?.('board:update', {
      type: 'board_deleted',
      boardId: req.params.boardId,
    });

    res.json({ message: 'Board deleted' });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    console.error(e);
    res.status(500).json({ message: 'Failed to delete board' });
  }
});

export default router;
