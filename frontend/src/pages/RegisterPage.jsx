import { ArrowRight, Lock, Mail, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import AuthPanel from '../components/AuthPanel';
import { useAuth } from '../context/useAuth';

function RegisterPage() {
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, isAuthenticated, isAuthReady } = useAuth();
  const navigate = useNavigate();

  if (!isAuthReady) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/saved" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (formValues.password !== formValues.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        name: formValues.name,
        email: formValues.email,
        password: formValues.password,
      });
      navigate('/saved', { replace: true });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to create your account right now.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPanel
      eyebrow="Create account"
      title="Create your DeltaDCA account."
      description="Save plans to your account, reopen them later, and keep your recurring-buy research available across sessions."
      footer={(
        <p>
          Already have an account?
          {' '}
          <Link to="/login" className="font-semibold text-[var(--color-accent-strong)] transition hover:text-[var(--color-accent)]">
            Sign in here
          </Link>
        </p>
      )}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="register-name" className="field-label">Name</label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              id="register-name"
              type="text"
              className="field-input pl-11"
              placeholder="Delta Investor"
              value={formValues.name}
              onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
              autoComplete="name"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-email" className="field-label">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              id="register-email"
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
          <label htmlFor="register-password" className="field-label">Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              id="register-password"
              type="password"
              className="field-input pl-11"
              placeholder="Create a secure password"
              value={formValues.password}
              onChange={(event) => setFormValues((current) => ({ ...current, password: event.target.value }))}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-confirm-password" className="field-label">Confirm password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              id="register-confirm-password"
              type="password"
              className={`field-input pl-11 ${
                formValues.confirmPassword && formValues.password !== formValues.confirmPassword
                  ? 'border-[rgba(190,18,60,0.22)]'
                  : ''
              }`}
              placeholder="Re-enter your password"
              value={formValues.confirmPassword}
              onChange={(event) => setFormValues((current) => ({ ...current, confirmPassword: event.target.value }))}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          {formValues.confirmPassword && formValues.password !== formValues.confirmPassword ? (
            <p className="mt-2 text-sm text-[var(--color-negative)]">Passwords do not match yet.</p>
          ) : null}
        </div>

        {errorMessage ? (
          <div className="rounded-[24px] border border-[rgba(190,18,60,0.14)] bg-[rgba(190,18,60,0.07)] px-4 py-3 text-sm text-[var(--color-negative)]">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          className="primary-button w-full"
          disabled={isSubmitting || (Boolean(formValues.confirmPassword) && formValues.password !== formValues.confirmPassword)}
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              Creating account
            </>
          ) : (
            <>
              Create DeltaDCA account
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthPanel>
  );
}

export default RegisterPage;
