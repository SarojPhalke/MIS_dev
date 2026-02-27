import React, { useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import {
  deleteUser,
  deleteUserFunction,
  getUserFunctions,
  getUserStats,
  getUsers,
  updateUserRole,
  upsertUserFunction
} from '../services/userService';

const Modal = ({ title, children, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-2xl rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const UserManagement = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('operator');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('operator');
  const [selectedFunctions, setSelectedFunctions] = useState([]);
  const [functionOverrides, setFunctionOverrides] = useState({});
  const [updateSaving, setUpdateSaving] = useState(false);

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
      await refreshUsersAndStats();
    } catch (err) {
      const apiError = err?.response?.data?.message || 'Failed to register user';
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };

  const refreshUsersAndStats = async () => {
    try {
      setPageError('');
      const [statsData, usersData] = await Promise.all([getUserStats(), getUsers()]);
      console.log('GET /users/stats:', statsData);
      console.log('GET /users:', usersData);
      setStats(statsData);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error('User management load error:', err);
      alert(err?.response?.data?.message || 'Failed to load user management data');
      setPageError(err?.response?.data?.message || 'Failed to load user management data');
    }
  };

  useEffect(() => {
    const init = async () => {
      setPageLoading(true);
      await refreshUsersAndStats();
      setPageLoading(false);
    };
    init();
  }, []);

  const perRoleCounts = useMemo(() => {
    const map = { admin: 0, engineer: 0, operator: 0, manager: 0 };
    (stats?.perRole || []).forEach((r) => {
      map[String(r.role).toLowerCase()] = r.count;
    });
    return map;
  }, [stats]);

  const openUpdateModal = async (u) => {
    setSelectedUser(u);
    setSelectedRole(u.role || 'operator');
    try {
      const funcs = await getUserFunctions(u.id);
      console.log(`GET /users/${u.id}/functions:`, funcs);
      setSelectedFunctions(Array.isArray(funcs) ? funcs : []);

      const overridesMap = {};
      (funcs || []).forEach((f) => {
        const isOverride = f.source === 'override';
        overridesMap[f.functionId] = {
          checked: isOverride,
          allowed: !!f.allowed
        };
      });
      setFunctionOverrides(overridesMap);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to load user functions');
    }
  };

  const closeUpdateModal = () => {
    setSelectedUser(null);
    setSelectedFunctions([]);
    setFunctionOverrides({});
    setSelectedRole('operator');
  };

  const saveUpdates = async () => {
    if (!selectedUser) return;
    setUpdateSaving(true);
    try {
      // 1) Update role
      if (selectedRole && selectedRole !== selectedUser.role) {
        await updateUserRole(selectedUser.id, selectedRole);
      }

      // 2) Update overrides
      const tasks = [];
      Object.entries(functionOverrides).forEach(([functionIdStr, info]) => {
        const functionId = Number(functionIdStr);
        if (info.checked) {
          tasks.push(upsertUserFunction(selectedUser.id, functionId, !!info.allowed));
        } else {
          // remove override if unchecked (safe even if none existed)
          tasks.push(deleteUserFunction(selectedUser.id, functionId));
        }
      });
      await Promise.all(tasks);

      alert('User updated successfully');
      closeUpdateModal();
      await refreshUsersAndStats();
    } catch (err) {
      console.error('Update user error:', err);
      alert(err?.response?.data?.message || 'Failed to update user');
    } finally {
      setUpdateSaving(false);
    }
  };

  const handleDeleteUser = async (u) => {
    const ok = window.confirm(`Delete user "${u.full_name}"?`);
    if (!ok) return;
    try {
      await deleteUser(u.id);
      alert('User deleted successfully');
      await refreshUsersAndStats();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-100">User Management</h2>
      <p className="text-sm text-slate-400">
        Create new portal users. Only accessible to Admin role. (Calls /api/auth/register)
      </p>

      {/* Stats */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">User Stats</h3>
        {pageLoading ? (
          <div className="text-xs text-slate-400">Loading...</div>
        ) : pageError ? (
          <div className="text-xs text-danger">{pageError}</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
              <p className="text-[11px] text-slate-400">Total Users</p>
              <p className="mt-1 text-xl font-semibold text-slate-100">{stats?.totalUsers ?? 0}</p>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
              <p className="text-[11px] text-slate-400">Admin</p>
              <p className="mt-1 text-xl font-semibold text-slate-100">{perRoleCounts.admin ?? 0}</p>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
              <p className="text-[11px] text-slate-400">Engineer</p>
              <p className="mt-1 text-xl font-semibold text-slate-100">{perRoleCounts.engineer ?? 0}</p>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
              <p className="text-[11px] text-slate-400">Operator</p>
              <p className="mt-1 text-xl font-semibold text-slate-100">{perRoleCounts.operator ?? 0}</p>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
              <p className="text-[11px] text-slate-400">Manager</p>
              <p className="mt-1 text-xl font-semibold text-slate-100">{perRoleCounts.manager ?? 0}</p>
            </div>
          </div>
        )}
      </section>

      {/* Users Table */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">Users</h3>
        {pageLoading ? (
          <div className="text-xs text-slate-400">Loading users...</div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-800 bg-slate-900">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <th className="px-3 py-2">Full Name</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">User Functions</th>
                  <th className="px-3 py-2">Update</th>
                  <th className="px-3 py-2">Delete</th>
                </tr>
              </thead>
              <tbody>
                {(users || []).map((u) => {
                  const allowed = (u.effectiveFunctions || [])
                    .filter((f) => f && f.allowed)
                    .map((f) => f.function_key);
                  return (
                    <tr key={u.id} className="border-t border-slate-800">
                      <td className="px-3 py-2">{u.full_name}</td>
                      <td className="px-3 py-2 capitalize">{u.role}</td>
                      <td className="px-3 py-2">
                        {allowed.length ? allowed.join(', ') : 'No Permissions'}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => openUpdateModal(u)}
                          className="rounded-md border border-slate-600 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                        >
                          Update
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          className="rounded-md border border-danger/60 px-2 py-1 text-[11px] text-danger hover:bg-danger/10"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {(!users || users.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-center text-xs text-slate-400">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

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

      {selectedUser && (
        <Modal title={`Update User: ${selectedUser.full_name}`} onClose={closeUpdateModal}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-accent focus:outline-none"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="engineer">Engineer</option>
                <option value="operator">Operator</option>
              </select>
            </div>

            <div className="rounded-md border border-slate-800 bg-slate-950 p-3">
              <p className="mb-2 text-xs font-semibold text-slate-200">Functions (effective)</p>
              <div className="max-h-64 space-y-2 overflow-auto pr-1">
                {selectedFunctions.map((f) => {
                  const state = functionOverrides[f.functionId] || { checked: false, allowed: !!f.allowed };
                  return (
                    <div key={f.functionId} className="flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-100">{f.function_key}</p>
                        <p className="text-[10px] text-slate-400">Source: {f.source}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-[11px] text-slate-300">
                          <input
                            type="checkbox"
                            checked={!!state.checked}
                            onChange={() =>
                              setFunctionOverrides((prev) => ({
                                ...prev,
                                [f.functionId]: { ...state, checked: !state.checked }
                              }))
                            }
                          />
                          Override
                        </label>
                        <select
                          disabled={!state.checked}
                          value={state.allowed ? 'true' : 'false'}
                          onChange={(e) =>
                            setFunctionOverrides((prev) => ({
                              ...prev,
                              [f.functionId]: { ...state, allowed: e.target.value === 'true' }
                            }))
                          }
                          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 disabled:opacity-50"
                        >
                          <option value="true">Allowed</option>
                          <option value="false">Denied</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
                {!selectedFunctions.length && (
                  <div className="text-xs text-slate-400">No functions found.</div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeUpdateModal}
                className="rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updateSaving}
                onClick={saveUpdates}
                className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {updateSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default UserManagement;

