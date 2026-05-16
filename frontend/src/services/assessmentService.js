/**
 * Assessment API service
 */
import apiClient from './api';

export const assessmentService = {
  /**
   * Get all assessments
   */
  getAll: async (skip = 0, limit = 100) => {
    const response = await apiClient.get('/assessments', {
      params: { skip, limit }
    });
    return response.data;
  },

  /**
   * Get single assessment by ID
   */
  getById: async (id) => {
    const response = await apiClient.get(`/assessments/${id}`);
    return response.data;
  },

  /**
   * Create new assessment
   */
  create: async (assessmentData) => {
    const response = await apiClient.post('/assessments', assessmentData);
    return response.data;
  },

  /**
   * Update assessment
   */
  update: async (id, assessmentData) => {
    const response = await apiClient.put(`/assessments/${id}`, assessmentData);
    return response.data;
  },

  /**
   * Delete assessment
   */
  delete: async (id) => {
    await apiClient.delete(`/assessments/${id}`);
  },
};

export default assessmentService;
