import apiClient from './api';

/**
 * Workspace Service - Interact with workspace folder opening APIs
 */
export const workspaceService = {
  /**
   * Open root workspace folder (/workspace) in file explorer
   * Used by Settings → Tools tab
   *
   * @returns {Promise<Object>} Response with success status, paths, and OS info
   */
  openRootWorkspace: async () => {
    const response = await apiClient.post('/workspace/open');
    return response.data;
  },

  /**
   * Open assessment-specific workspace folder in file explorer
   * Used by AssessmentDetail page
   *
   * Detects container mismatches and returns warning if assessment was created
   * in a different container than currently active.
   *
   * @param {number} assessmentId - ID of the assessment
   * @returns {Promise<Object>} Success response with paths, or warning response if container mismatch
   */
  openAssessmentWorkspace: async (assessmentId) => {
    const response = await apiClient.post(`/workspace/assessments/${assessmentId}/open`);
    return response.data;
  },

  /**
   * Recreate workspace in current container after container switch
   *
   * Creates a new workspace folder in the currently active container and
   * updates the assessment's workspace_path and container_name.
   *
   * @param {number} assessmentId - ID of the assessment
   * @returns {Promise<Object>} Response with new workspace paths
   */
  recreateWorkspace: async (assessmentId) => {
    const response = await apiClient.post(`/workspace/assessments/${assessmentId}/recreate`);
    return response.data;
  }
};

export default workspaceService;
