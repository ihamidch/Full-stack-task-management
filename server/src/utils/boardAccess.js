import { Board } from '../models/Board.js';

export async function getBoardIfMember(boardId, userId) {
  const board = await Board.findById(boardId);
  if (!board) return { board: null, ok: false };
  const uid = userId.toString();
  const owner = board.owner.toString();
  const isMember =
    owner === uid || board.members.some((m) => m.toString() === uid);
  return { board, ok: isMember };
}

export async function assertBoardMember(boardId, userId) {
  const { board, ok } = await getBoardIfMember(boardId, userId);
  if (!board) {
    const err = new Error('Board not found');
    err.status = 404;
    throw err;
  }
  if (!ok) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  return board;
}

export function canManageTask(task, user) {
  if (!task || !user) return false;
  if (user.role === 'admin') return true;
  const uid = user._id.toString();
  const isCreator = task.createdBy?.toString?.() === uid;
  const isAssignee = task.assignee?.toString?.() === uid;
  return isCreator || isAssignee;
}
