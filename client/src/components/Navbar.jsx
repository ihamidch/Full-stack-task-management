import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar({ title, subtitle, showBackLink = true }) {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          {showBackLink ? (
            <Link to="/" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
              ← Boards
            </Link>
          ) : (
            <span className="text-sm font-semibold tracking-tight text-indigo-400">FlowBoard</span>
          )}
          {title && <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">{title}</h1>}
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-400 sm:inline">{user?.name}</span>
          {user?.role && (
            <span className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-indigo-300">
              {user.role}
            </span>
          )}
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
