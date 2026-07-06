import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, MailCheck, Bus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { sanitizeInput } from '../utils/authHelpers';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const value = sanitizeInput(email);
    if (!value || !/^\S+@\S+\.\S+$/.test(value)) {
      setError('Enter a valid work email or username.');
      return;
    }

    setSubmitting(true);
    const result = await forgotPassword(value);
    setSubmitting(false);
    if (result.success) setSent(true);
    else setError(result.message);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4">
            <Bus className="w-7 h-7 text-slate-950" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reset Password</h1>
          <p className="text-xs text-slate-400 mt-1">We'll send recovery instructions to your registered email.</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-7 sm:p-8 shadow-2xl animate-scaleUp">
          {sent ? (
            <div className="text-center py-4 space-y-3 animate-fadeIn">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <MailCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-sm font-bold text-white">Check your inbox</h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                If an account matches those details, password reset instructions have been sent.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Work Email or Username
                </label>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  className="w-full bg-slate-950/70 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors disabled:opacity-50"
                  placeholder="you@transportboard.lk"
                />
                {error && <p className="text-[11px] text-rose-400 mt-1.5">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-slate-950 font-bold text-sm rounded-xl py-3 transition-colors shadow-lg shadow-emerald-500/10"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  'Send Reset Instructions'
                )}
              </button>
            </form>
          )}

          <button
            onClick={() => navigate('/login')}
            className="mt-6 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
