/**
 * Recon Data API service
 */
import apiClient from './api';

export const reconService = {
  /**
   * Get all recon data for an assessment
   */
  getAll: async (assessmentId, dataType = null) => {
    const response = await apiClient.get(`/assessments/${assessmentId}/recon`, {
      params: dataType ? { data_type: dataType } : {}
    });
    return response.data;
  },

  /**
   * Add new recon data
   */
  create: async (assessmentId, reconData) => {
    const response = await apiClient.post(`/assessments/${assessmentId}/recon`, reconData);
    return response.data;
  },

  /**
   * Delete recon data
   */
  delete: async (assessmentId, reconId) => {
    await apiClient.delete(`/assessments/${assessmentId}/recon/${reconId}`);
  },

  /**
   * Get recon data grouped by type
   */
  getAllGrouped: async (assessmentId) => {
    const allData = await reconService.getAll(assessmentId);

    return {
      endpoints: allData.filter(r => r.data_type === 'endpoint'),
      technologies: allData.filter(r => r.data_type === 'technology'),
      services: allData.filter(r => r.data_type === 'service'),
      subdomains: allData.filter(r => r.data_type === 'subdomain'),
    };
  },
};

export default reconService;
