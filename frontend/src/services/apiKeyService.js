/**
 * API keys for the HTTP MCP transport.
 *
 * The full key is returned ONLY from createApiKey() and must be shown to
 * the user immediately — it's never retrievable afterwards.
 */
import apiClient from './api';

export async function listApiKeys(ownerUserId) {
  const params = ownerUserId ? { owner_user_id: ownerUserId } : {};
  const res = await apiClient.get('/api-keys', { params });
  return res.data;
}

export async function createApiKey(name) {
  const res = await apiClient.post('/api-keys', { name });
  return res.data;
}

export async function revokeApiKey(id) {
  await apiClient.delete(`/api-keys/${id}`);
}

export async function getMcpSetting(key) {
  const res = await apiClient.get(`/system/settings/${key}`);
  return res.data;
}

export async function updateMcpSetting(key, value) {
  const res = await apiClient.put(`/system/settings/${key}`, { value });
  return res.data;
}
