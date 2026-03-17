import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isAuthReady } = useAuth();
  const location = useLocation();

  if (!isAuthReady) {
    return (
      <section className="panel-elevated mx-auto max-w-3xl p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-accent)]">Authenticating</p>
        <h1 className="mt-4 font-['Fraunces'] text-3xl font-semibold text-[var(--color-ink)]">
          Checking your DeltaDCA session
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-muted-strong)]">
          We&apos;re verifying your account before opening your saved plans.
        </p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;
