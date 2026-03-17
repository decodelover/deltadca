import {
  Bookmark,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  X,
} from 'lucide-react';
import { createElement, useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { getInitials } from '../utils/formatters';

const navigation = [
  { to: '/', label: 'Planner', icon: LayoutDashboard },
  { to: '/saved', label: 'Saved Plans', icon: Bookmark },
];

function getUtcLabel() {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date());
}

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [utcLabel, setUtcLabel] = useState(getUtcLabel);
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setUtcLabel(getUtcLabel());
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/');
  };

  const linkClassName = ({ isActive }) => [
    'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition duration-300',
    isActive
      ? 'border-[rgba(125,215,255,0.22)] bg-[rgba(125,215,255,0.12)] text-[var(--color-ink)]'
      : 'border-transparent bg-[rgba(11,19,36,0.4)] text-[var(--color-muted-strong)] hover:border-[rgba(156,175,208,0.16)] hover:bg-[rgba(17,28,52,0.88)] hover:text-[var(--color-ink)]',
  ].join(' ');

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-[96rem] px-3 pt-3 sm:px-6 lg:px-8">
        <div className="rounded-[26px] border border-[rgba(156,175,208,0.12)] bg-[rgba(7,13,27,0.76)] px-4 py-3.5 shadow-[0_24px_80px_-52px_rgba(0,0,0,0.92)] backdrop-blur-2xl sm:rounded-[32px] sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="group flex items-center gap-4" onClick={() => setIsOpen(false)}>
              <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#f08c56,#56a8ff)] text-white shadow-[0_18px_42px_-22px_rgba(86,168,255,0.48)]">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <p className="font-['Fraunces'] text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                    DeltaDCA
                  </p>
                  <span className="hidden rounded-full border border-[rgba(125,215,255,0.16)] bg-[rgba(125,215,255,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-[var(--color-highlight)] sm:inline-flex">
                    Live
                  </span>
                </div>
                <p className="text-xs uppercase tracking-[0.32em] text-[var(--color-muted)]">
                  Recurring crypto planning
                </p>
              </div>
            </Link>

            <nav className="hidden items-center gap-2 lg:flex">
              {navigation.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={linkClassName}>
                  {createElement(Icon, { className: 'h-4 w-4' })}
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              <div className="rounded-full border border-[rgba(156,175,208,0.12)] bg-[rgba(11,19,36,0.62)] px-4 py-2 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                  Market time
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">{utcLabel} UTC</p>
              </div>

              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-3 rounded-full border border-[rgba(156,175,208,0.12)] bg-[rgba(11,19,36,0.68)] px-3 py-2">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(240,140,86,0.24),rgba(86,168,255,0.22))] text-sm font-semibold text-[var(--color-ink)]">
                      {getInitials(user?.name)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{user?.name}</p>
                      <p className="truncate text-xs text-[var(--color-muted)]">{user?.email}</p>
                    </div>
                  </div>

                  <button type="button" className="ghost-button" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="ghost-button">
                    <UserCircle2 className="h-4 w-4" />
                    Sign in
                  </Link>
                  <Link to="/register" className="primary-button">
                    <Sparkles className="h-4 w-4" />
                    Create account
                  </Link>
                </>
              )}
            </div>

            <button
              type="button"
              className="ghost-button lg:hidden"
              aria-label="Toggle navigation"
              onClick={() => setIsOpen((current) => !current)}
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {isOpen ? (
            <div className="mt-4 border-t border-[rgba(156,175,208,0.1)] pt-4 lg:hidden">
              <div className="flex flex-col gap-3">
                {navigation.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={linkClassName}
                    onClick={() => setIsOpen(false)}
                  >
                    {createElement(Icon, { className: 'h-4 w-4' })}
                    {label}
                  </NavLink>
                ))}

                {isAuthenticated ? (
                  <div className="mt-2 rounded-[28px] border border-[rgba(156,175,208,0.1)] bg-[rgba(11,19,36,0.74)] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(240,140,86,0.24),rgba(86,168,255,0.22))] font-semibold text-[var(--color-ink)]">
                        {getInitials(user?.name)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--color-ink)]">{user?.name}</p>
                        <p className="truncate text-sm text-[var(--color-muted)]">{user?.email}</p>
                      </div>
                    </div>

                    <button type="button" className="ghost-button mt-4 w-full" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 grid gap-3">
                    <Link to="/login" className="ghost-button w-full" onClick={() => setIsOpen(false)}>
                      <UserCircle2 className="h-4 w-4" />
                      Sign in
                    </Link>
                    <Link to="/register" className="primary-button w-full" onClick={() => setIsOpen(false)}>
                      <Sparkles className="h-4 w-4" />
                      Create account
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
