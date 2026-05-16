/**
 * Card API service (Finding/Observation/Info)
 */
import apiClient from './api';

export const cardService = {
  /**
   * Get all cards for an assessment
   */
  getAll: async (assessmentId, cardType = null) => {
    const response = await apiClient.get(`/assessments/${assessmentId}/cards`, {
      params: cardType ? { card_type: cardType } : {}
    });
    return response.data;
  },

  /**
   * Get single card
   */
  getById: async (assessmentId, cardId) => {
    const response = await apiClient.get(`/assessments/${assessmentId}/cards/${cardId}`);
    return response.data;
  },

  /**
   * Create new card
   */
  create: async (assessmentId, cardData) => {
    const response = await apiClient.post(`/assessments/${assessmentId}/cards`, cardData);
    return response.data;
  },

  /**
   * Update card
   */
  update: async (assessmentId, cardId, cardData) => {
    const response = await apiClient.put(`/assessments/${assessmentId}/cards/${cardId}`, cardData);
    return response.data;
  },

  /**
   * Delete card
   */
  delete: async (assessmentId, cardId) => {
    await apiClient.delete(`/assessments/${assessmentId}/cards/${cardId}`);
  },
};

export default cardService;
