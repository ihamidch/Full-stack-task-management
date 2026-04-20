import { Task } from '../models/Task.js';

/**
 * Move task within or across lists and normalize positions (0..n-1) per list.
 */
export async function reorderTask(taskId, newListId, newIndex) {
  const task = await Task.findById(taskId);
  if (!task) return null;

  const oldListId = task.list.toString();
  const boardId = task.board;

  if (oldListId === newListId) {
    const all = await Task.find({ list: newListId }).sort({ position: 1 });
    const ordered = all.filter((t) => t._id.toString() !== taskId);
    const insertAt = Math.min(Math.max(0, newIndex), ordered.length);
    ordered.splice(insertAt, 0, task);
    for (let i = 0; i < ordered.length; i++) {
      await Task.updateOne(
        { _id: ordered[i]._id },
        { $set: { position: i, list: newListId } }
      );
    }
    return Task.findById(taskId).populate('assignee', 'name email');
  }

  const oldOthers = await Task.find({ list: oldListId, _id: { $ne: taskId } }).sort({ position: 1 });
  for (let i = 0; i < oldOthers.length; i++) {
    await Task.updateOne({ _id: oldOthers[i]._id }, { $set: { position: i } });
  }

  const newOthers = await Task.find({ list: newListId, _id: { $ne: taskId } }).sort({ position: 1 });
  const insertAt = Math.min(Math.max(0, newIndex), newOthers.length);
  newOthers.splice(insertAt, 0, task);

  for (let i = 0; i < newOthers.length; i++) {
    await Task.updateOne(
      { _id: newOthers[i]._id },
      { $set: { position: i, list: newListId, board: boardId } }
    );
  }

  return Task.findById(taskId).populate('assignee', 'name email');
}
