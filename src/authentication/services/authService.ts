import {
  AuthSession,
  AuthUser,
  ForgotPasswordResult,
  LoginCredentials,
  LoginResult,
} from '../types/auth';
import { sanitizeInput } from '../utils/authHelpers';

/**
 * authService.ts
 * -----------------------------------------------------------------------------
 * Real authentication service — talks to the Express + PostgreSQL backend
 * (server/routes/auth.routes.js). Every method returns the same shape the
 * previous mock version did (AuthSession with access/refresh tokens), so
 * `AuthContext` and every component that consumes `useAuth()` keep working
 * unmodified.
 * -----------------------------------------------------------------------------
 */

// In dev, Vite proxies "/api" to the Express server (see vite.config.ts).
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

/** Generic, non-specific error message — never reveal whether the username exists. */
const INVALID_CREDENTIALS_MESSAGE = 'Invalid username or password. Please try again.';
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    const username = sanitizeInput(credentials.username);
    const password = credentials.password; // never sanitize/trim passwords — whitespace can be intentional

    if (!username || !password) {
      return { success: false, error: INVALID_CREDENTIALS_MESSAGE };
    }

    try {
      const result = await postJson<LoginResult>('/auth/login', { username, password });
      return result;
    } catch (e) {
      console.error('Login request failed', e);
      return { success: false, error: 'Unable to reach the server. Please try again.' };
    }
  },

  async logout(): Promise<void> {
    try {
      await postJson('/auth/logout', {});
    } catch {
      // JWTs are stateless on this backend — logging out client-side is what
      // actually matters. A failed network call here shouldn't block it.
    }
  },

  /** Re-validates a persisted session against the server on app load, refreshing if the access token has expired. */
  async validateSession(session: AuthSession): Promise<AuthSession | null> {
    if (!session?.tokens) return null;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${session.tokens.accessToken}` },
      });

      if (res.ok) {
        const { user } = (await res.json()) as { user: AuthUser };
        return { user, tokens: session.tokens };
      }

      // Access token expired/invalid — fall back to the refresh token.
      if (res.status === 401) {
        return this.refreshSession(session);
      }

      return null;
    } catch (e) {
      console.error('Session validation failed', e);
      return null;
    }
  },

  /** Exchanges the refresh token for a brand-new access+refresh pair. Returns null if the refresh token is also invalid/expired. */
  async refreshSession(session: AuthSession): Promise<AuthSession | null> {
    try {
      const result = await postJson<{ success: boolean; session?: AuthSession }>('/auth/refresh', {
        refreshToken: session.tokens.refreshToken,
      });
      return result.success && result.session ? result.session : null;
    } catch (e) {
      console.error('Session refresh failed', e);
      return null;
    }
  },

  async forgotPassword(username: string): Promise<ForgotPasswordResult> {
    try {
      return await postJson<ForgotPasswordResult>('/auth/password-reset', { username });
    } catch (e) {
      console.error('Password reset request failed', e);
      return { success: false, message: GENERIC_ERROR_MESSAGE };
    }
  },
};
