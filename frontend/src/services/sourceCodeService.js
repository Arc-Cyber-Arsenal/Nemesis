/**
 * Source Code API Service
 * Manages source code import (Git clone / ZIP upload) for assessments.
 */
import apiClient from './api';

/**
 * Detect available branches for a Git repository URL.
 * @param {number} assessmentId
 * @param {string} url - Git HTTPS URL
 * @returns {Promise<{ branches: string[], url: string }>}
 */
export async function detectBranches(assessmentId, url) {
    const response = await apiClient.post(
        `/assessments/${assessmentId}/source/branches`,
        { url }
    );
    return response.data;
}

/**
 * Clone a Git repository into the assessment's /source directory.
 * @param {number} assessmentId
 * @param {string} url - Git HTTPS URL
 * @param {string|null} branch - Branch name (null = default branch)
 * @param {boolean} shallow - If true, uses --depth 1 (faster, no history)
 * @returns {Promise<Object>}
 */
export async function cloneRepository(assessmentId, url, branch = null, shallow = false) {
    const response = await apiClient.post(
        `/assessments/${assessmentId}/source/clone`,
        { url, branch, shallow },
        { timeout: 15 * 60 * 1000 } // 15 minutes — large repos can take a while
    );
    return response.data;
}

/**
 * Upload a ZIP file and extract it into the assessment's /source directory.
 * @param {number} assessmentId
 * @param {File} file - ZIP file
 * @returns {Promise<Object>}
 */
export async function uploadSourceZip(assessmentId, file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(
        `/assessments/${assessmentId}/source/upload-zip`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
}

/**
 * List all source code directories for an assessment.
 * @param {number} assessmentId
 * @returns {Promise<Array>}
 */
export async function listSourceCode(assessmentId) {
    const response = await apiClient.get(`/assessments/${assessmentId}/source/list`);
    return response.data;
}

/**
 * Delete a source code directory.
 * @param {number} assessmentId
 * @param {string} name - Directory name
 * @returns {Promise<void>}
 */
export async function deleteSourceCode(assessmentId, name) {
    await apiClient.delete(`/assessments/${assessmentId}/source/${encodeURIComponent(name)}`);
}
