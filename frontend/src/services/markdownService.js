import apiClient from './api';

/**
 * List all markdown files in an assessment workspace
 */
export const listMarkdownFiles = async (assessmentId) => {
    const response = await apiClient.get(`/assessments/${assessmentId}/markdown/files`);
    return response.data;
};

/**
 * Get content of a specific markdown file
 */
export const getMarkdownContent = async (assessmentId, filePath) => {
    const response = await apiClient.get(
        `/assessments/${assessmentId}/markdown/content`,
        { params: { path: filePath } }
    );
    return response.data;
};

export default {
    listMarkdownFiles,
    getMarkdownContent,
};
