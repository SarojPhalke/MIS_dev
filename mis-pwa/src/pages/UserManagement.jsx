import React, { useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

const UserManagement = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('operator');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const response = await client.post('/auth/register', {
        full_name: fullName,
        email,
        password,
        role
      });
      const apiMessage = response.data?.data?.message || 'User registered successfully';
      setMessage(apiMessage);
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('operator');
    } catch (err) {
      const apiError = err?.response?.data?.message || 'Failed to register user';
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="text-sm text-slate-400">
        You do not have permission to access User Management.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-100">User Management</h2>
      <p className="text-sm text-slate-400">
        Create new portal users. Only accessible to Admin role. (Calls /api/auth/register)
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-md border border-slate-800 bg-slate-900 p-4 text-sm"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300">
            Full Name
          </label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            placeholder="Jane Operator"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            placeholder="user@example.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
            placeholder="Temporary password"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
          >
            <option value="operator">Operator</option>
            <option value="engineer">Engineer</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Creating user...' : 'Create User'}
        </button>

        {message && (
          <div className="mt-2 rounded-md bg-success/10 px-3 py-2 text-xs text-success">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-2 rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}
      </form>
    </div>
  );
};

export default UserManagement;

