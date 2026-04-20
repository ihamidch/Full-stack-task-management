import { Router } from 'express';
import { List } from '../models/List.js';
import { Task } from '../models/Task.js';
import { Board } from '../models/Board.js';
import { authRequired, attachUser } from '../middleware/auth.js';
import { assertBoardMember } from '../utils/boardAccess.js';
import { logActivity } from '../utils/activityLogger.js';
import { reorderTask } from '../utils/taskReorder.js';

const router = Router();
router.use(authRequired, attachUser);

async function canAssign(board, assigneeId) {
  if (!assigneeId) return true;
  const b = await Board.findById(board).select('owner members');
  if (!b) return false;
  const uid = assigneeId.toString();
  return b.owner.toString() === uid || b.members.some((m) => m.toString() === uid);
}

router.post('/lists/:listId/tasks', async (req, res) => {
  try {
    const list = await List.findById(req.params.listId);
    if (!list) return res.status(404).json({ message: 'List not found' });

    await assertBoardMember(list.board, req.userId);

    const { title, description = '', assignee, dueDate } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (assignee && !(await canAssign(list.board, assignee))) {
      return res.status(400).json({ message: 'Assignee must be a board member' });
    }

    const maxPos = await Task.findOne({ list: list._id }).sort({ position: -1 }).select('position');
    const position = maxPos ? maxPos.position + 1 : 0;

    const task = await Task.create({
      title: title.trim(),
      description: String(description).trim(),
      board: list.board,
      list: list._id,
      position,
      assignee: assignee || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: req.userId,
    });

    await logActivity({
      boardId: list.board,
      userId: req.userId,
      action: 'task_created',
      entityType: 'Task',
      entityId: task._id,
      meta: { title: task.title },
    });

    const populated = await Task.findById(task._id)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email');

    const io = req.app.get('io');
    io?.to?.(`board:${list.board}`)?.emit?.('board:update', {
      type: 'task_created',
      boardId: list.board.toString(),
      task: populated.toObject(),
    });

    res.status(201).json({ task: populated });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    console.error(e);
    res.status(500).json({ message: 'Failed to create task' });
  }
});

router.patch('/tasks/:taskId', async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    await assertBoardMember(task.board, req.userId);

    const { title, description, assignee, dueDate, listId, position } = req.body;

    if (listId != null && position != null) {
      const targetList = await List.findById(listId);
      if (!targetList || targetList.board.toString() !== task.board.toString()) {
        return res.status(400).json({ message: 'Invalid target list' });
      }
      const oldList = task.list.toString();
      const updated = await reorderTask(task._id, listId, Number(position));
      await logActivity({
        boardId: task.board,
        userId: req.userId,
        action: 'task_moved',
        entityType: 'Task',
        entityId: task._id,
        meta: { title: updated.title, fromList: oldList, toList: listId },
      });

      const io = req.app.get('io');
      io?.to?.(`board:${task.board}`)?.emit?.('board:update', {
        type: 'task_moved',
        boardId: task.board.toString(),
        taskId: task._id.toString(),
      });

      return res.json({ task: updated });
    }

    if (title != null) task.title = String(title).trim();
    if (description != null) task.description = String(description).trim();
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;

    if (assignee !== undefined) {
      if (assignee && !(await canAssign(task.board, assignee))) {
        return res.status(400).json({ message: 'Assignee must be a board member' });
      }
      task.assignee = assignee || null;
    }

    await task.save();
    const populated = await Task.findById(task._id)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email');

    await logActivity({
      boardId: task.board,
      userId: req.userId,
      action: 'task_updated',
      entityType: 'Task',
      entityId: task._id,
      meta: { title: task.title },
    });

    const io = req.app.get('io');
    io?.to?.(`board:${task.board}`)?.emit?.('board:update', {
      type: 'task_updated',
      boardId: task.board.toString(),
      task: populated.toObject(),
    });

    res.json({ task: populated });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    console.error(e);
    res.status(500).json({ message: 'Failed to update task' });
  }
});

router.delete('/tasks/:taskId', async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    await assertBoardMember(task.board, req.userId);

    const boardId = task.board.toString();
    const listId = task.list;
    await Task.deleteOne({ _id: task._id });

    const remaining = await Task.find({ list: listId }).sort({ position: 1 });
    for (let i = 0; i < remaining.length; i++) {
      await Task.updateOne({ _id: remaining[i]._id }, { $set: { position: i } });
    }

    await logActivity({
      boardId: task.board,
      userId: req.userId,
      action: 'task_deleted',
      entityType: 'Task',
      entityId: task._id,
      meta: { title: task.title },
    });

    const io = req.app.get('io');
    io?.to?.(`board:${boardId}`)?.emit?.('board:update', {
      type: 'task_deleted',
      boardId,
      taskId: req.params.taskId,
    });

    res.json({ message: 'Task deleted' });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    console.error(e);
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

export default router;
