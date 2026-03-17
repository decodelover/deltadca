import { useEffect, useState } from 'react';
import { getCurrentUser, loginUser, registerUser } from '../api/auth';
import { AUTH_STORAGE_KEY } from '../api/client';
import AuthContext from './auth-context';

const emptySession = {
  token: null,
  user: null,
};

function readStoredSession() {
  if (typeof window === 'undefined') {
    return emptySession;
  }

  try {
    const storedSession = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!storedSession) {
      return emptySession;
    }

    const parsedSession = JSON.parse(storedSession);

    if (!parsedSession?.token) {
      return emptySession;
    }

    return {
      token: parsedSession.token,
      user: parsedSession.user ?? null,
    };
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return emptySession;
  }
}

export function AuthProvider({ children }) {
  const [bootstrappedSession] = useState(readStoredSession);
  const [session, setSession] = useState(bootstrappedSession);
  const [isLoadingSession, setIsLoadingSession] = useState(Boolean(bootstrappedSession.token));

  const persistSession = (nextSession) => {
    setSession(nextSession);

    if (typeof window === 'undefined') {
      return;
    }

    if (nextSession?.token && nextSession?.user) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
      return;
    }

    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      if (!bootstrappedSession.token) {
        setIsLoadingSession(false);
        return;
      }

      try {
        const user = await getCurrentUser();

        if (!isMounted) {
          return;
        }

        persistSession({
          token: bootstrappedSession.token,
          user,
        });
      } catch {
        if (isMounted) {
          persistSession(emptySession);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSession(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, [bootstrappedSession.token]);

  const login = async (credentials) => {
    const response = await loginUser(credentials);

    persistSession({
      token: response.token,
      user: response.user,
    });

    return response;
  };

  const register = async (payload) => {
    const response = await registerUser(payload);

    persistSession({
      token: response.token,
      user: response.user,
    });

    return response;
  };

  const logout = () => {
    persistSession(emptySession);
  };

  return (
    <AuthContext.Provider
      value={{
        token: session.token,
        user: session.user,
        isAuthenticated: Boolean(session.token && session.user),
        isAuthReady: !isLoadingSession,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
