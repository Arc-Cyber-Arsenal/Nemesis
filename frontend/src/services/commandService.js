/**
 * Command execution and history API service
 */
import apiClient from './api';

export const commandService = {
  /**
   * Get command history for an assessment
   */
  getHistory: async (assessmentId, limit = 50) => {
    const response = await apiClient.get(`/assessments/${assessmentId}/commands`, {
      params: { limit }
    });
    return response.data;
  },

  /**
   * Get single command result
   */
  getById: async (assessmentId, commandId) => {
    const response = await apiClient.get(`/assessments/${assessmentId}/commands/${commandId}`);
    return response.data;
  },

  /**
   * Execute a command
   */
  execute: async (assessmentId, command, phase = null) => {
    const response = await apiClient.post(`/assessments/${assessmentId}/commands/execute`, {
      command,
      phase
    });
    return response.data;
  },

  /**
   * Get all commands across assessments with pagination (for infinite scroll)
   */
  getAllCommands: async ({ skip = 0, limit = 50, status = null, search = null, command_type = null }) => {
    const params = { skip, limit };
    if (status) params.status = status;
    if (search) params.search = search;
    if (command_type) params.command_type = command_type;

    const response = await apiClient.get('/commands', { params });
    return response.data;
  },

  /**
   * Get command statistics (total, passed, failed, avg_execution_time)
   */
  getStats: async () => {
    const response = await apiClient.get('/commands/stats');
    return response.data;
  },
};

export default commandService;
