import client from '../api/client';

export const getKpiSummary = (params = {}) => {
  return client.get('/kpi/summary', { params });
};

export const getMTTR = (params = {}) => {
  return client.get('/kpi/mttr', { params });
};

export const getMTBF = (params = {}) => {
  return client.get('/kpi/mtbf', { params });
};

export const getAvailability = (params = {}) => {
  return client.get('/kpi/availability', { params });
};

export const getUptime = (params = {}) => {
  return client.get('/kpi/uptime', { params });
};

export const getSpareCost = (params = {}) => {
  return client.get('/kpi/spare-cost', { params });
};

