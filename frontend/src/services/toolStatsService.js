import apiClient from './api';

/**
 * Tool Usage Statistics Service
 * Fetches and manages tool usage analytics
 */
const toolStatsService = {
    /**
     * Get tool usage statistics
     * @param {Object} params - Query parameters
     * @param {number} params.assessment_id - Filter by assessment ID
     * @param {number} params.since_days - Analyze last N days
     * @param {boolean} params.include_failed - Include failed commands
     * @param {number} params.top_n - Number of top tools to return
     * @returns {Promise<Object>} Tool usage stats
     */
    async getToolStats(params = {}) {
        const queryParams = new URLSearchParams();

        if (params.assessment_id) {
            queryParams.append('assessment_id', params.assessment_id);
        }
        if (params.since_days) {
            queryParams.append('since_days', params.since_days);
        }
        if (params.include_failed !== undefined) {
            queryParams.append('include_failed', params.include_failed);
        }
        if (params.top_n) {
            queryParams.append('top_n', params.top_n);
        }

        const queryString = queryParams.toString();
        const url = `/system/tool-usage-stats${queryString ? `?${queryString}` : ''}`;

        const { data } = await apiClient.get(url);
        return data;
    },

    /**
     * Get top N tools (convenience method)
     * @param {number} n - Number of tools
     * @param {number} since_days - Optional time filter
     * @returns {Promise<Array>} Top N tools
     */
    async getTopTools(n = 10, since_days = null) {
        const stats = await this.getToolStats({ top_n: n, since_days });
        return stats.most_used_tools || [];
    },

    /**
     * Get tool categories distribution
     * @param {number} since_days - Optional time filter
     * @returns {Promise<Object>} Categories data
     */
    async getCategories(since_days = null) {
        const stats = await this.getToolStats({ since_days });
        return stats.tool_categories || {};
    },

    /**
     * Get stats for specific assessment
     * @param {number} assessment_id - Assessment ID
     * @returns {Promise<Object>} Assessment-specific stats
     */
    async getAssessmentStats(assessment_id) {
        return await this.getToolStats({ assessment_id });
    }
};

export default toolStatsService;
