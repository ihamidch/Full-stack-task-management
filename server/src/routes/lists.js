import { Router } from 'express';
import { List } from '../models/List.js';
import { Task } from '../models/Task.js';
import { authRequired, attachUser } from '../middleware/auth.js';
import { assertBoardMember } from '../utils/boardAccess.js';
import { logActivity } from '../utils/activityLogger.js';

const router = Router();
router.use(authRequired, attachUser);

router.post('/boards/:boardId/lists', async (req, res) => {
  try {
    const { boardId } = req.params;
    await assertBoardMember(boardId, req.userId);

    const { title } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const maxPos = await List.findOne({ board: boardId }).sort({ position: -1 }).select('position');
    const position = maxPos ? maxPos.position + 1 : 0;

    const list = await List.create({
      title: title.trim(),
      board: boardId,
      position,
    });

    await logActivity({
      boardId,
      userId: req.userId,
      action: 'list_created',
      entityType: 'List',
      entityId: list._id,
      meta: { title: list.title },
    });

    const io = req.app.get('io');
    io?.to?.(`board:${boardId}`).emit('board:update', {
      type: 'list_created',
      boardId,
      listId: list._id.toString(),
    });

    res.status(201).json({ list: { ...list.toObject(), tasks: [] } });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    console.error(e);
    res.status(500).json({ message: 'Failed to create list' });
  }
});

router.patch('/lists/:listId', async (req, res) => {
  try {
    const list = await List.findById(req.params.listId);
    if (!list) return res.status(404).json({ message: 'List not found' });

    await assertBoardMember(list.board, req.userId);

    const { title, position } = req.body;
    if (title != null) list.title = String(title).trim();
    if (position != null) list.position = Number(position);
    await list.save();

    await logActivity({
      boardId: list.board,
      userId: req.userId,
      action: 'list_updated',
      entityType: 'List',
      entityId: list._id,
      meta: { title: list.title },
    });

    const io = req.app.get('io');
    io?.to?.(`board:${list.board}`).emit('board:update', {
      type: 'list_updated',
      boardId: list.board.toString(),
    });

    res.json({ list: list.toObject() });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    console.error(e);
    res.status(500).json({ message: 'Failed to update list' });
  }
});

router.delete('/lists/:listId', async (req, res) => {
  try {
    const list = await List.findById(req.params.listId);
    if (!list) return res.status(404).json({ message: 'List not found' });

    await assertBoardMember(list.board, req.userId);

    const boardId = list.board.toString();
    await Task.deleteMany({ list: list._id });
    await List.deleteOne({ _id: list._id });

    await logActivity({
      boardId: list.board,
      userId: req.userId,
      action: 'list_deleted',
      entityType: 'List',
      entityId: list._id,
      meta: { title: list.title },
    });

    const io = req.app.get('io');
    io?.to?.(`board:${boardId}`).emit('board:update', { type: 'list_deleted', boardId });

    res.json({ message: 'List deleted' });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    console.error(e);
    res.status(500).json({ message: 'Failed to delete list' });
  }
});

export default router;
