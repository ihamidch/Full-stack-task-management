import { ActivityLog } from '../models/ActivityLog.js';

export async function logActivity({ boardId, userId, action, entityType = 'Task', entityId = null, meta = {} }) {
  await ActivityLog.create({
    board: boardId,
    user: userId,
    action,
    entityType,
    entityId,
    meta,
  });
}
