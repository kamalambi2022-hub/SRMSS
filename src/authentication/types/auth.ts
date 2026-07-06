import { RoleName } from '../constants/roles';
import { Permission, ModuleRoute } from '../constants/permissions';

/** Authenticated user's public profile — never contains the password/hash. */
export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: RoleName;
  depot?: string;
  avatarInitials: string;
}

/**
 * Shape mirrors what a Django REST + SimpleJWT backend would return, so the
 * mock service can be swapped for a real `fetch('/api/auth/login/')` call
 * later without touching any consuming component.
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds the access token expires at. */
  expiresAt: number;
}

export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginResult {
  success: boolean;
  session?: AuthSession;
  error?: string;
}

export interface ForgotPasswordResult {
  success: boolean;
  message: string;
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  tokens: AuthTokens | null;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<ForgotPasswordResult>;
  hasPermission: (permission: Permission) => boolean;
  hasModuleAccess: (moduleRoute: ModuleRoute) => boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
}
