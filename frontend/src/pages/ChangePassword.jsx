/**
 * Forced password change page.
 *
 * Rendered by AuthGate when the authenticated user has must_change_password=true.
 * Blocks access to the rest of the app until completed.
 */
import { useState } from 'react';
import { Lock, AlertCircle, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { changePassword as apiChangePassword } from '../services/authService';

export default function ChangePassword() {
  const { user, refreshUser, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirm) {
      setError('New password and confirmation do not match');
      return;
    }
    if (newPassword.length < 7) {
      setError('New password must be at least 7 characters');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from the current one');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await apiChangePassword(currentPassword, newPassword);
      refreshUser(updated);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <KeyRound className="w-12 h-12 mx-auto mb-4 text-primary-600" />
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Set a new password
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            You must change your password before continuing.
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 p-6">
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
            Signed in as <span className="font-semibold">{user?.username}</span>
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordField
              label="Current password"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoFocus
            />
            <PasswordField
              label="New password (min 7 chars)"
              value={newPassword}
              onChange={setNewPassword}
            />
            <PasswordField
              label="Confirm new password"
              value={confirm}
              onChange={setConfirm}
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {submitting ? 'Saving...' : 'Update password'}
            </button>
          </form>

          <button
            type="button"
            onClick={logout}
            className="mt-4 w-full text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, autoFocus }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        {label}
      </label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoFocus={autoFocus}
          className="w-full pl-10 pr-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        />
      </div>
    </div>
  );
}
