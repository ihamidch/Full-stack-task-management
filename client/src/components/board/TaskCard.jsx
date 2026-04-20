import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function formatDue(d) {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function TaskCard({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const due = formatDue(task.dueDate);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-slate-700/80 bg-slate-800/90 shadow-sm ${
        isDragging ? 'z-10 opacity-90 ring-2 ring-indigo-500/50' : ''
      }`}
    >
      <button
        type="button"
        className="w-full px-3 py-2 text-left"
        onClick={() => onOpen?.(task)}
      >
        <p className="text-sm font-medium text-slate-100">{task.title}</p>
        {task.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-slate-400">{task.description}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {task.assignee && (
            <span className="rounded bg-slate-700/80 px-1.5 py-0.5 text-slate-200">
              {task.assignee.name}
            </span>
          )}
          {due && <span className="text-amber-400/90">Due {due}</span>}
        </div>
      </button>
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab border-t border-slate-700/50 px-2 py-1 text-center text-[10px] uppercase tracking-wider text-slate-500 active:cursor-grabbing"
        title="Drag to move"
      >
        ⋮⋮
      </div>
    </div>
  );
}
