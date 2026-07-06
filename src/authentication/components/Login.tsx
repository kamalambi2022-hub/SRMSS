import React, { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, ShieldCheck, Bus, Lock, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isValidUsername, sanitizeInput } from '../utils/authHelpers';
import { ROLE_LABELS } from '../constants/roles';

const DEMO_ACCOUNTS = [
  { role: ROLE_LABELS.Administrator, username: 'admin', password: 'Admin@123' },
  { role: ROLE_LABELS['Depot Manager'], username: 'manager', password: 'Manager@123' },
  { role: ROLE_LABELS.Operator, username: 'operator', password: 'Operator@123' },
];

export default function Login() {
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});

  const redirectTo = location.state?.from?.pathname ?? '/dashboard';

  const validate = (): boolean => {
    const errs: { username?: string; password?: string } = {};
    if (!username.trim()) errs.username = 'Username is required.';
    else if (!isValidUsername(username.trim())) errs.username = 'Enter a valid username.';
    if (!password) errs.password = 'Password is required.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    const result = await login({
      username: sanitizeInput(username),
      password,
      rememberMe,
    });
    setSubmitting(false);

    if (result.success) {
      navigate(redirectTo, { replace: true });
    } else {
      setFormError(result.error ?? 'Unable to sign in.');
    }
  };

  const fillDemo = (demoUsername: string, demoPassword: string) => {
    setUsername(demoUsername);
    setPassword(demoPassword);
    setFormError(null);
    setFieldErrors({});
  };

  const busy = submitting || isLoading;

  return (
    <div className="min-h-screen w-full bg-slate-950 relative overflow-hidden flex items-center justify-center p-4 font-sans">
      {/* Ambient route-line backdrop */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.18] pointer-events-none"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <path
          d="M -50 650 C 200 650, 250 450, 450 450 S 650 250, 850 250 S 1050 100, 1300 100"
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          strokeDasharray="10 14"
        />
        <path
          d="M -50 150 C 150 150, 220 320, 420 320 S 600 520, 820 520 S 1000 700, 1300 700"
          fill="none"
          stroke="#334155"
          strokeWidth="2"
          strokeDasharray="4 10"
        />
        <circle cx="450" cy="450" r="5" fill="#10b981" />
        <circle cx="850" cy="250" r="5" fill="#10b981" />
        <circle cx="420" cy="320" r="4" fill="#475569" />
      </svg>

      <div className="relative w-full max-w-md">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4">
            <Bus className="w-7 h-7 text-slate-950" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-[var(--font-display)]">
            Sri Lanka Transport Board
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-[0.2em] mt-1">
            Smart Route Management &amp; Scheduling System
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-7 sm:p-8 shadow-2xl animate-scaleUp">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Depot Access Sign-In</h2>
            <p className="text-xs text-slate-400 mt-1">Authorized personnel only. All sessions are logged.</p>
          </div>

          {(formError || error) && (
            <div className="mb-5 flex items-start gap-2.5 bg-rose-950/50 border border-rose-900/60 text-rose-300 text-xs rounded-xl px-3.5 py-3 animate-fadeIn">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{formError || error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={busy}
                  aria-invalid={!!fieldErrors.username}
                  aria-describedby={fieldErrors.username ? 'username-error' : undefined}
                  className="w-full bg-slate-950/70 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors disabled:opacity-50"
                  placeholder="e.g. admin"
                />
              </div>
              {fieldErrors.username && (
                <p id="username-error" className="text-[11px] text-rose-400 mt-1.5">{fieldErrors.username}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <a
                  href="/forgot-password"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/forgot-password');
                  }}
                  className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  className="w-full bg-slate-950/70 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors disabled:opacity-50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="text-[11px] text-rose-400 mt-1.5">{fieldErrors.password}</p>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={busy}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
              />
              <span className="text-xs text-slate-400">Remember me on this device</span>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-slate-950 font-bold text-sm rounded-xl py-3 transition-colors shadow-lg shadow-emerald-500/10"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Demo Credentials
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((acct) => (
                <button
                  key={acct.username}
                  type="button"
                  onClick={() => fillDemo(acct.username, acct.password)}
                  className="text-center bg-slate-950/60 hover:bg-slate-800 border border-slate-800 rounded-lg py-2 px-1 transition-colors"
                >
                  <span className="block text-[10px] font-bold text-slate-300">{acct.role}</span>
                  <span className="block text-[9px] text-slate-500 font-mono mt-0.5">{acct.username}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-600 mt-6">
          © {new Date().getFullYear()} Sri Lanka Transport Board — SRMSS v1.0. All access is monitored and audited.
        </p>
      </div>
    </div>
  );
}
