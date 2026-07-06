import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ROLE_LABELS } from '../constants/roles';

export default function Unauthorized() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8 text-rose-400" />
        </div>

        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">403 — Access Denied</h1>
        <p className="text-sm text-slate-400 leading-relaxed mb-1">
          {user
            ? `Your role (${ROLE_LABELS[user.role]}) does not have permission to view this module.`
            : 'You do not have permission to view this page.'}
        </p>
        <p className="text-xs text-slate-500 mb-8">This attempt has been recorded in the security audit trail.</p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl px-5 py-2.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl px-5 py-2.5 transition-colors border border-slate-700"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
