import React, { createContext, useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { authService } from '../services/authService';
import { SESSION_EXPIRED_EVENT } from '../../services/api';
import {
  clearPersistedSession,
  persistSession,
  readPersistedSession,
  SESSION_TIMEOUT_MS,
  SESSION_WARNING_MS,
  STORAGE_KEYS,
} from '../utils/authHelpers';
import { roleHasModuleAccess, roleHasPermission, Permission, ModuleRoute } from '../constants/permissions';
import {
  AuthContextValue,
  AuthState,
  ForgotPasswordResult,
  LoginCredentials,
  LoginResult,
} from '../types/auth';

interface AuthenticatedPayload {
  user: NonNullable<AuthState['user']>;
  tokens: NonNullable<AuthState['tokens']>;
}

type AuthAction =
  | { type: 'LOADING' }
  | { type: 'LOGIN_SUCCESS'; payload: AuthenticatedPayload }
  | { type: 'LOGIN_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'RESTORE_SESSION'; payload: AuthenticatedPayload }
  | { type: 'NO_SESSION' };

const initialState: AuthState = {
  status: 'idle',
  user: null,
  tokens: null,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, status: 'loading', error: null };
    case 'LOGIN_SUCCESS':
    case 'RESTORE_SESSION':
      return {
        status: 'authenticated',
        user: action.payload.user,
        tokens: action.payload.tokens,
        error: null,
      };
    case 'LOGIN_ERROR':
      return { ...state, status: 'unauthenticated', user: null, tokens: null, error: action.payload };
    case 'LOGOUT':
    case 'NO_SESSION':
      return { status: 'unauthenticated', user: null, tokens: null, error: null };
    default:
      return state;
  }
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    authService.logout();
    clearPersistedSession();
    dispatch({ type: 'LOGOUT' });
  }, []);

  // If any business-data API call (routes/buses/etc.) comes back 401 — e.g.
  // the access token expired mid-session — drop the session so the person
  // is returned to the login screen instead of seeing silently-failing CRUD.
  useEffect(() => {
    const handleExpired = () => logout();
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, [logout]);

  // --- Restore session on first load ------------------------------------
  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'LOADING' });

    (async () => {
      const persisted = readPersistedSession();
      if (!persisted) {
        if (!cancelled) dispatch({ type: 'NO_SESSION' });
        return;
      }
      const validated = await authService.validateSession(persisted);
      if (cancelled) return;
      if (validated) {
        // validateSession may have silently rotated the tokens via a refresh
        // — persist the new pair so the next reload doesn't reuse stale ones.
        if (validated.tokens.accessToken !== persisted.tokens.accessToken) {
          const rememberMe = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
          persistSession(validated, rememberMe);
        }
        dispatch({ type: 'RESTORE_SESSION', payload: { user: validated.user, tokens: validated.tokens } });
      } else {
        clearPersistedSession();
        dispatch({ type: 'NO_SESSION' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // --- Automatic session expiration / inactivity logout -------------------
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);

    if (state.status !== 'authenticated') return;

    warningTimer.current = setTimeout(() => {
      // A dedicated toast/modal could subscribe to this via a custom event;
      // kept intentionally simple here.
      console.warn('SRMSS: session will expire soon due to inactivity.');
    }, SESSION_TIMEOUT_MS - SESSION_WARNING_MS);

    inactivityTimer.current = setTimeout(() => {
      logout();
    }, SESSION_TIMEOUT_MS);
  }, [state.status, logout]);

  useEffect(() => {
    if (state.status !== 'authenticated') return;

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => resetInactivityTimer();

    activityEvents.forEach((evt) => window.addEventListener(evt, handleActivity));
    resetInactivityTimer();

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, handleActivity));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (warningTimer.current) clearTimeout(warningTimer.current);
    };
  }, [state.status, resetInactivityTimer]);

  // --- Actions -------------------------------------------------------------
  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResult> => {
    dispatch({ type: 'LOADING' });
    const result = await authService.login(credentials);

    if (result.success && result.session) {
      persistSession(result.session, credentials.rememberMe);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: result.session.user, tokens: result.session.tokens },
      });
    } else {
      dispatch({ type: 'LOGIN_ERROR', payload: result.error ?? 'Unable to sign in.' });
    }

    return result;
  }, []);

  const forgotPassword = useCallback(async (email: string): Promise<ForgotPasswordResult> => {
    return authService.forgotPassword(email);
  }, []);

  const hasPermission = useCallback(
    (permission: Permission) => roleHasPermission(state.user?.role, permission),
    [state.user],
  );

  const hasModuleAccess = useCallback(
    (moduleRoute: ModuleRoute) => roleHasModuleAccess(state.user?.role, moduleRoute),
    [state.user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      forgotPassword,
      hasPermission,
      hasModuleAccess,
      isAuthenticated: state.status === 'authenticated',
      isLoading: state.status === 'loading' || state.status === 'idle',
    }),
    [state, login, logout, forgotPassword, hasPermission, hasModuleAccess],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
