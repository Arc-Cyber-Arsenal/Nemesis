/**
 * Section/Phase API service
 */
import apiClient from './api';

export const sectionService = {
  /**
   * Get all sections for an assessment
   */
  getAll: async (assessmentId) => {
    const response = await apiClient.get(`/assessments/${assessmentId}/sections`);
    return response.data;
  },

  /**
   * Create or update a section
   */
  createOrUpdate: async (assessmentId, sectionData) => {
    const response = await apiClient.post(`/assessments/${assessmentId}/sections`, sectionData);
    return response.data;
  },

  /**
   * Update section
   */
  update: async (assessmentId, sectionId, sectionData) => {
    const response = await apiClient.put(`/assessments/${assessmentId}/sections/${sectionId}`, sectionData);
    return response.data;
  },

  /**
   * Delete section
   */
  delete: async (assessmentId, sectionId) => {
    await apiClient.delete(`/assessments/${assessmentId}/sections/${sectionId}`);
  },
};

export default sectionService;
