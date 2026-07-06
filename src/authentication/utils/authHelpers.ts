import { AuthSession } from '../types/auth';

/** Storage keys — namespaced to avoid clashing with the app's own localStorage usage. */
export const STORAGE_KEYS = {
  SESSION: 'srmss_auth_session',
  REMEMBER_ME: 'srmss_auth_remember_me',
} as const;

/** Session/inactivity timeout window, in milliseconds. */
export const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity
export const SESSION_WARNING_MS = 60 * 1000; // warn 60s before auto-logout

/**
 * Persist a session. When `rememberMe` is false we still need the session to
 * survive a page refresh (SPA reloads), so we always write to localStorage,
 * but we record the "remember me" preference so a real backend integration
 * can decide whether to issue a long-lived refresh token or a session-only one.
 */
export function persistSession(session: AuthSession, rememberMe: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, JSON.stringify(rememberMe));
  } catch {
    // Storage can fail in private-browsing contexts; auth still works in-memory.
  }
}

export function readPersistedSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.user || !parsed?.tokens) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPersistedSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
  } catch {
    // no-op
  }
}

export function isTokenExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt;
}

/**
 * Very small sanitizer for text form fields: strips angle brackets so raw
 * HTML/script tags can't be echoed back into the DOM anywhere downstream.
 * This is a defence-in-depth measure — React already escapes rendered text —
 * but it keeps stored values (audit logs, usernames) clean too.
 */
export function sanitizeInput(value: string): string {
  return value.replace(/[<>]/g, '').trim();
}

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9._-]{3,32}$/.test(username);
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
}

/** Lightweight heuristic strength meter for the (future) reset-password UI. */
export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels: PasswordStrength['label'][] = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  return { score: score as PasswordStrength['score'], label: labels[score] };
}

/** Generates the two-letter initials shown in the avatar badge. */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}


