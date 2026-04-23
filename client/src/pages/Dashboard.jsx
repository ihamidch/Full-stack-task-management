import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import Navbar from '../components/Navbar.jsx';

export default function Dashboard() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [boardsRes, statsRes] = await Promise.all([
        api.get('/boards'),
        api.get('/dashboard/stats'),
      ]);
      setBoards(boardsRes.data.boards || []);
      setStats(
        statsRes.data.stats || {
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          inProgressTasks: 0,
        }
      );
    } catch (err) {
      const message = err.response?.data?.message || 'Could not load dashboard';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createBoard(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError('');
    try {
      const { data } = await api.post('/boards', { title: title.trim() });
      setBoards((prev) => [data.board, ...prev]);
      setTitle('');
      toast.success('Board created');
      load();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create board';
      setError(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar
        showBackLink={false}
        title="Your boards"
        subtitle="Create spaces for projects and drag tasks between lists."
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total tasks', value: stats.totalTasks, tone: 'text-indigo-300' },
            { label: 'Completed', value: stats.completedTasks, tone: 'text-emerald-300' },
            { label: 'Pending', value: stats.pendingTasks, tone: 'text-amber-300' },
            { label: 'In Progress', value: stats.inProgressTasks, tone: 'text-sky-300' },
          ].map((card) => (
            <article
              key={card.label}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm"
            >
              <p className="text-xs uppercase tracking-wide text-slate-400">{card.label}</p>
              <p className={`mt-1 text-2xl font-semibold ${card.tone}`}>{card.value}</p>
            </article>
          ))}
        </section>

        <form onSubmit={createBoard} className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="new-board" className="mb-1 block text-sm font-medium text-slate-300">
              New board
            </label>
            <input
              id="new-board"
              type="text"
              placeholder="e.g. Product roadmap"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <button
            type="submit"
            disabled={creating || !title.trim()}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>

        {error && (
          <p className="mb-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-28 animate-pulse rounded-xl border border-slate-800 bg-slate-900/60"
              />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-12 text-center text-slate-400">
            No boards yet. Name your first board above to get started.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((b) => (
              <li key={b._id}>
                <Link
                  to={`/board/${b._id}`}
                  className="block rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-indigo-500/40 hover:bg-slate-900"
                >
                  <h2 className="font-semibold text-white">{b.title}</h2>
                  {b.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-400">{b.description}</p>
                  ) : null}
                  <p className="mt-3 text-xs text-slate-500">
                    Updated {new Date(b.updatedAt).toLocaleDateString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
