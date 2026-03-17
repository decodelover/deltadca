import { ArrowRight, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import AuthPanel from '../components/AuthPanel';
import { useAuth } from '../context/useAuth';

function LoginPage() {
  const [formValues, setFormValues] = useState({
    email: '',
    password: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || '/saved';

  if (!isAuthReady) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await login({
        email: formValues.email,
        password: formValues.password,
      });

      navigate(redirectPath, { replace: true });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to sign in right now.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPanel
      eyebrow="Sign in"
      title="Access your DeltaDCA account."
      description="Sign in to open saved plans, keep your planning history in sync, and continue where you left off."
      footer={(
        <p>
          New to DeltaDCA?
          {' '}
          <Link to="/register" className="font-semibold text-[var(--color-accent-strong)] transition hover:text-[var(--color-accent)]">
            Create your account
          </Link>
        </p>
      )}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="login-email" className="field-label">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              id="login-email"
              type="email"
              className="field-input pl-11"
              placeholder="you@example.com"
              value={formValues.email}
              onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="login-password" className="field-label">Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              id="login-password"
              type="password"
              className="field-input pl-11"
              placeholder="Enter your password"
              value={formValues.password}
              onChange={(event) => setFormValues((current) => ({ ...current, password: event.target.value }))}
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-[24px] border border-[rgba(190,18,60,0.14)] bg-[rgba(190,18,60,0.07)] px-4 py-3 text-sm text-[var(--color-negative)]">
            {errorMessage}
          </div>
        ) : null}

        <button type="submit" className="primary-button w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              Signing in
            </>
          ) : (
            <>
              Sign in to DeltaDCA
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthPanel>
  );
}

export default LoginPage;
