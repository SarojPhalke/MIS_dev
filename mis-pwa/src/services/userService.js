import client from '../api/client';

export const getUsers = async () => {
  const res = await client.get('/users');
  return res.data?.data ?? res.data;
};

export const getUserStats = async () => {
  const res = await client.get('/users/stats');
  return res.data?.data ?? res.data;
};

export const updateUserRole = async (id, role) => {
  const res = await client.put(`/users/${id}/role`, { role });
  return res.data?.data ?? res.data;
};

export const deleteUser = async (id) => {
  const res = await client.delete(`/users/${id}`);
  return res.data?.data ?? res.data;
};

export const getUserFunctions = async (id) => {
  const res = await client.get(`/users/${id}/functions`);
  return res.data?.data ?? res.data;
};

export const upsertUserFunction = async (id, functionId, allowed) => {
  const res = await client.put(`/users/${id}/functions`, { functionId, allowed });
  return res.data?.data ?? res.data;
};

export const deleteUserFunction = async (id, functionId) => {
  const res = await client.delete(`/users/${id}/functions/${functionId}`);
  return res.data?.data ?? res.data;
};

