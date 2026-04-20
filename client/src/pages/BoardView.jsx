import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { io } from 'socket.io-client';
import { api, getSocketUrl, isRealtimeEnabled } from '../api/client.js';
import Navbar from '../components/Navbar.jsx';
import TaskCard from '../components/board/TaskCard.jsx';
import TaskModal from '../components/board/TaskModal.jsx';
import ActivityPanel from '../components/board/ActivityPanel.jsx';

function findContainer(items, id) {
  if (Object.prototype.hasOwnProperty.call(items, id)) {
    return id;
  }
  return Object.keys(items).find((key) => items[key].includes(id));
}

function buildItemsFromBoard(board) {
  const next = {};
  if (!board?.lists) return next;
  for (const l of board.lists) {
    next[l._id] = (l.tasks || []).map((t) => t._id);
  }
  return next;
}

function BoardColumn({ list, taskIds, tasksById, onOpenTask }) {
  const { setNodeRef, isOver } = useDroppable({ id: list._id });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl border bg-slate-900/50 ${
        isOver ? 'border-indigo-500/50 ring-1 ring-indigo-500/30' : 'border-slate-800'
      }`}
    >
      <div className="border-b border-slate-800 px-3 py-2">
        <h3 className="font-semibold text-slate-100">{list.title}</h3>
        <p className="text-xs text-slate-500">{taskIds.length} tasks</p>
      </div>
      <div className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {taskIds.map((id) =>
            tasksById[id] ? (
              <TaskCard key={id} task={tasksById[id]} onOpen={onOpenTask} />
            ) : null
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export default function BoardView() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [items, setItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTask, setActiveTask] = useState(null);
  const [modalTask, setModalTask] = useState(null);
  const [showActivity, setShowActivity] = useState(false);
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [newTasks, setNewTasks] = useState({});
  const [memberEmail, setMemberEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');

  const tasksById = useMemo(() => {
    const m = {};
    if (!board?.lists) return m;
    for (const l of board.lists) {
      for (const t of l.tasks || []) {
        m[t._id] = t;
      }
    }
    return m;
  }, [board]);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/boards/${boardId}`);
      setBoard(data.board);
      setItems(buildItemsFromBoard(data.board));
    } catch {
      setError('Could not load board');
      setBoard(null);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    if (!isRealtimeEnabled()) return undefined;
    const url = getSocketUrl();
    const token = localStorage.getItem('token');
    const socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.emit('joinBoard', boardId, () => {});
    socket.on('board:update', () => {
      loadBoard();
    });

    return () => {
      socket.emit('leaveBoard', boardId);
      socket.disconnect();
    };
  }, [boardId, loadBoard]);

  useEffect(() => {
    if (!showActivity) return;
    let cancelled = false;
    (async () => {
      setActivityLoading(true);
      try {
        const { data } = await api.get(`/boards/${boardId}/activity`);
        if (!cancelled) setActivity(data.activity || []);
      } catch {
        if (!cancelled) setActivity([]);
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [boardId, showActivity]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  async function persistMove(taskId, listId, position) {
    await api.patch(`/tasks/${taskId}`, { listId, position });
  }

  function handleDragStart(event) {
    const id = event.active.id;
    if (tasksById[id]) setActiveTask(tasksById[id]);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeContainer = findContainer(items, activeId);
    let overContainer = findContainer(items, overId);
    if (!overContainer && Object.prototype.hasOwnProperty.call(items, overId)) {
      overContainer = overId;
    }
    if (!activeContainer || !overContainer) return;

    if (activeContainer === overContainer) {
      const oldIndex = items[activeContainer].indexOf(activeId);
      let newIndex;
      if (Object.prototype.hasOwnProperty.call(items, overId) && overId === activeContainer) {
        newIndex = items[activeContainer].length - 1;
      } else {
        newIndex = items[overContainer].indexOf(overId);
      }
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      const newOrder = arrayMove(items[activeContainer], oldIndex, newIndex);
      setItems((prev) => ({ ...prev, [activeContainer]: newOrder }));
      const pos = newOrder.indexOf(activeId);
      persistMove(activeId, activeContainer, pos).catch(() => loadBoard());
    } else {
      const from = [...items[activeContainer]];
      const to = [...items[overContainer]];
      const fromIndex = from.indexOf(activeId);
      if (fromIndex < 0) return;
      from.splice(fromIndex, 1);

      const overIsList = Object.prototype.hasOwnProperty.call(items, overId);
      let toIndex;
      if (overIsList && overId === overContainer) {
        toIndex = to.length;
      } else {
        toIndex = to.indexOf(overId);
        if (toIndex < 0) toIndex = to.length;
      }

      to.splice(toIndex, 0, activeId);

      setItems((prev) => ({
        ...prev,
        [activeContainer]: from,
        [overContainer]: to,
      }));
      persistMove(activeId, overContainer, toIndex).catch(() => loadBoard());
    }
  }

  function handleDragCancel() {
    setActiveTask(null);
  }

  function onOpenTask(task) {
    setModalTask(task);
  }

  function onTaskSaved() {
    loadBoard();
  }

  function onTaskDeleted() {
    loadBoard();
  }

  async function addTask(listId) {
    const title = (newTasks[listId] || '').trim();
    if (!title) return;
    try {
      await api.post(`/lists/${listId}/tasks`, { title });
      setNewTasks((s) => ({ ...s, [listId]: '' }));
      loadBoard();
    } catch {
      setError('Could not add task');
    }
  }

  async function inviteMember(e) {
    e.preventDefault();
    if (!memberEmail.trim()) return;
    setError('');
    setInviteMessage('');
    try {
      const { data } = await api.patch(`/boards/${boardId}`, { memberEmail: memberEmail.trim() });
      setMemberEmail('');
      setInviteMessage(data.message || 'Member added successfully');
      loadBoard();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add member');
    }
  }

  if (loading && !board) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (error && !board) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-16 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar title={board?.title} subtitle={board?.description || 'Drag cards between lists'} />

      <div className="relative">
        {showActivity && (
          <ActivityPanel
            activity={activity}
            loading={activityLoading}
            onClose={() => setShowActivity(false)}
          />
        )}

        <div className="mx-auto max-w-[100vw] px-4 py-4 sm:px-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowActivity((s) => !s)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            >
              {showActivity ? 'Hide activity' : 'Activity'}
            </button>
            <form onSubmit={inviteMember} className="flex flex-wrap items-center gap-2">
              <input
                type="email"
                placeholder="Invite by email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                className="min-w-[200px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
              >
                Add member
              </button>
            </form>
          </div>

          {error ? (
            <p className="mb-3 text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          {inviteMessage ? (
            <p className="mb-3 text-sm text-emerald-400" role="status">
              {inviteMessage}
            </p>
          ) : null}
          <div className="mb-4 text-xs text-slate-400">
            Members:{' '}
            {[board?.owner, ...(board?.members || [])]
              .filter(Boolean)
              .filter((m, idx, arr) => arr.findIndex((x) => x._id === m._id) === idx)
              .map((m) => m.email)
              .join(', ')}
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="flex gap-4 overflow-x-auto pb-6">
              {(board?.lists || []).map((list) => (
                <div key={list._id} className="flex w-72 shrink-0 flex-col gap-2">
                  <BoardColumn
                    list={list}
                    taskIds={items[list._id] || []}
                    tasksById={tasksById}
                    onOpenTask={onOpenTask}
                  />
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      addTask(list._id);
                    }}
                    className="flex gap-2 rounded-lg border border-slate-800/80 bg-slate-900/40 p-2"
                  >
                    <input
                      type="text"
                      placeholder="New task…"
                      value={newTasks[list._id] || ''}
                      onChange={(e) =>
                        setNewTasks((s) => ({ ...s, [list._id]: e.target.value }))
                      }
                      className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100 outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      className="shrink-0 rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500"
                    >
                      Add
                    </button>
                  </form>
                </div>
              ))}
            </div>
            <DragOverlay>
              {activeTask ? (
                <div className="w-72 rounded-lg border border-indigo-500/50 bg-slate-800 p-3 shadow-xl">
                  <p className="text-sm font-medium text-white">{activeTask.title}</p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {modalTask && (
        <TaskModal
          task={modalTask}
          board={board}
          onClose={() => setModalTask(null)}
          onSaved={onTaskSaved}
          onDeleted={onTaskDeleted}
        />
      )}
    </div>
  );
}
