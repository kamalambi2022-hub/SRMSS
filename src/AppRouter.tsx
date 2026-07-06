import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './authentication/components/Login';
import ForgotPassword from './authentication/components/ForgotPassword';
import Unauthorized from './authentication/components/Unauthorized';
import ProtectedRoute from './authentication/components/ProtectedRoute';
import App from './App';

/**
 * Top-level route table.
 *
 * `/login`, `/forgot-password` and `/403` are public. Everything else lives
 * under `/dashboard/*`, which is wrapped in <ProtectedRoute> so an
 * unauthenticated visitor is bounced to /login (and returned to their
 * original destination after signing in). Module-level (per-tab) access is
 * additionally enforced inside <App /> via `hasModuleAccess`.
 */
export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/403" element={<Unauthorized />} />

      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
