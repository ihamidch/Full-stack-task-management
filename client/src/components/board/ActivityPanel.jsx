function labelAction(log) {
  const map = {
    board_created: 'created the board',
    board_updated: 'updated the board',
    task_created: 'created task',
    task_updated: 'updated task',
    task_moved: 'moved a task',
    task_deleted: 'deleted a task',
    list_created: 'added a list',
    list_updated: 'updated a list',
    list_deleted: 'removed a list',
    member_added: 'added a member',
  };
  return map[log.action] || log.action;
}

export default function ActivityPanel({ activity, loading, onClose }) {
  return (
    <aside className="fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="font-semibold text-white">Activity</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label="Close activity"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : activity.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {activity.map((log) => (
              <li
                key={log._id}
                className="rounded-lg border border-slate-800/80 bg-slate-950/50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-indigo-300">{log.user?.name || 'Someone'}</span>{' '}
                <span className="text-slate-400">{labelAction(log)}</span>
                {log.meta?.title ? (
                  <span className="text-slate-300"> — “{log.meta.title}”</span>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
