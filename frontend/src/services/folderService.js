/**
 * Folder API service
 */
import apiClient from './api';

export const folderService = {
  // Get all folders with assessment counts
  async getFolders() {
    const { data } = await apiClient.get('/folders');
    return data;
  },

  // Get single folder
  async getFolder(folderId) {
    const { data } = await apiClient.get(`/folders/${folderId}`);
    return data;
  },

  // Create new folder
  async createFolder(folderData) {
    const { data } = await apiClient.post('/folders', folderData);
    return data;
  },

  // Update folder
  async updateFolder(folderId, folderData) {
    const { data } = await apiClient.put(`/folders/${folderId}`, folderData);
    return data;
  },

  // Delete folder
  async deleteFolder(folderId) {
    await apiClient.delete(`/folders/${folderId}`);
  },

  // Get assessments by folder
  async getAssessmentsByFolder(folderId, options = {}) {
    const params = new URLSearchParams();
    if (folderId !== null && folderId !== undefined) {
      params.append('folder_id', folderId);
    }
    if (options.status) params.append('status', options.status);
    if (options.is_archived !== undefined) params.append('is_archived', options.is_archived);
    if (options.limit) params.append('limit', options.limit);
    if (options.skip) params.append('skip', options.skip);

    const { data } = await apiClient.get(`/assessments?${params.toString()}`);
    return data;
  },

  // Move assessment to folder
  async moveAssessment(assessmentId, folderId) {
    const { data } = await apiClient.post(`/assessments/${assessmentId}/move`, {
      folder_id: folderId === null ? null : parseInt(folderId)
    });
    return data;
  },

  // Duplicate assessment with optional data copy
  async duplicateAssessment(assessmentId, options = {}) {
    const { data } = await apiClient.post(`/assessments/${assessmentId}/duplicate`, options);
    return data;
  }
};

export default folderService;
