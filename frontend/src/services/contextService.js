/**
 * Context Documents API Service
 */
import apiClient from './api';

/**
 * Upload a context document to an assessment
 * @param {number} assessmentId - Assessment ID
 * @param {File} file - File to upload
 * @returns {Promise} Upload result
 */
export async function uploadContextDocument(assessmentId, file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(
        `/assessments/${assessmentId}/context/upload`,
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }
    );

    return response.data;
}

/**
 * List all context documents for an assessment
 * @param {number} assessmentId - Assessment ID
 * @returns {Promise} List of context documents
 */
export async function listContextDocuments(assessmentId) {
    const response = await apiClient.get(`/assessments/${assessmentId}/context/files`);
    return response.data;
}

/**
 * Delete a context document
 * @param {number} assessmentId - Assessment ID
 * @param {string} filename - Name of the file to delete
 * @returns {Promise}
 */
export async function deleteContextDocument(assessmentId, filename) {
    const response = await apiClient.delete(
        `/assessments/${assessmentId}/context/${encodeURIComponent(filename)}`
    );
    return response.data;
}

/**
 * Get workspace tree structure
 * @param {number} assessmentId - Assessment ID
 * @returns {Promise} Workspace tree
 */
export async function getWorkspaceTree(assessmentId) {
    const response = await apiClient.get(`/assessments/${assessmentId}/context/tree`);
    return response.data;
}
