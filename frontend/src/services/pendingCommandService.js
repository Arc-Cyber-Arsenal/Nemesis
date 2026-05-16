/**
 * Pending Command Service - API calls for pending command management
 */
import apiClient from './api';

/**
 * List pending commands
 * @param {string} statusFilter - "pending", "approved", "rejected", "executed"
 * @param {number} assessmentId - Optional assessment filter
 * @returns {Promise<Array>}
 */
export const listPendingCommands = async (statusFilter = 'pending', assessmentId = null) => {
  const response = await apiClient.get('/pending-commands', {
    params: {
      status_filter: statusFilter,
      assessment_id: assessmentId
    }
  });
  return response.data;
};

/**
 * Get a specific pending command
 * @param {number} commandId
 * @returns {Promise<Object>}
 */
export const getPendingCommand = async (commandId) => {
  const response = await apiClient.get(`/pending-commands/${commandId}`);
  return response.data;
};

/**
 * Approve and execute a pending command
 * @param {number} commandId
 * @param {string} approvedBy - Username/identifier
 * @returns {Promise<Object>}
 */
export const approvePendingCommand = async (commandId, approvedBy = 'admin') => {
  const response = await apiClient.post(`/pending-commands/${commandId}/approve`, {
    approved_by: approvedBy
  });
  return response.data;
};

/**
 * Reject a pending command
 * @param {number} commandId
 * @param {string} rejectedBy - Username/identifier
 * @param {string} reason - Reason for rejection
 * @returns {Promise<Object>}
 */
export const rejectPendingCommand = async (commandId, rejectedBy = 'admin', reason = '') => {
  const response = await apiClient.post(`/pending-commands/${commandId}/reject`, {
    rejected_by: rejectedBy,
    rejection_reason: reason
  });
  return response.data;
};

/**
 * Delete a pending command
 * @param {number} commandId
 * @returns {Promise<void>}
 */
export const deletePendingCommand = async (commandId) => {
  await apiClient.delete(`/pending-commands/${commandId}`);
};

export default {
  listPendingCommands,
  getPendingCommand,
  approvePendingCommand,
  rejectPendingCommand,
  deletePendingCommand
};
