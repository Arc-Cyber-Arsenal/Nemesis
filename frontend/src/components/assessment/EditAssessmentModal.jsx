import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import apiClient from '../../services/api';

const EditAssessmentModal = ({ assessment, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    category: '',
    environment: 'non_specifie',
    start_date: '',
    end_date: '',
    scope: '',
    limitations: '',
    objectives: '',
    target_domains: '',
    ip_scopes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (assessment) {
      setFormData({
        name: assessment.name || '',
        client_name: assessment.client_name || '',
        category: assessment.category || '',
        environment: assessment.environment || 'non_specifie',
        start_date: assessment.start_date || '',
        end_date: assessment.end_date || '',
        scope: assessment.scope || '',
        limitations: assessment.limitations || '',
        objectives: assessment.objectives || '',
        target_domains: Array.isArray(assessment.target_domains)
          ? assessment.target_domains.join('\n')
          : assessment.target_domains || '',
        ip_scopes: Array.isArray(assessment.ip_scopes)
          ? assessment.ip_scopes.join('\n')
          : assessment.ip_scopes || '',
      });
    }
  }, [assessment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Convert target_domains and ip_scopes back to arrays
      // Convert empty strings to null for optional fields
      const submitData = {
        name: formData.name,
        // Dates: empty string → null
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        // Text fields: empty string → null
        client_name: formData.client_name?.trim() || null,
        category: formData.category?.trim() || null,
        environment: formData.environment || 'non_specifie',
        scope: formData.scope?.trim() || null,
        limitations: formData.limitations?.trim() || null,
        objectives: formData.objectives?.trim() || null,
        // Arrays
        target_domains: formData.target_domains
          ? formData.target_domains.split('\n').filter(d => d.trim())
          : [],
        ip_scopes: formData.ip_scopes
          ? formData.ip_scopes.split('\n').filter(s => s.trim())
          : [],
      };

      await apiClient.put(`/assessments/${assessment.id}`, submitData);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Update error:', err.response?.data);
      setError(
        Array.isArray(err.response?.data?.detail)
          ? err.response.data.detail.map(e => e.msg).join(', ')
          : err.response?.data?.detail || 'Failed to update assessment'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!assessment) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/70 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl bg-white dark:bg-neutral-800 rounded-xl shadow-strong animate-slide-up max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex-shrink-0">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Edit Assessment</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Update assessment details and configuration</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
            </button>
          </div>

          {/* Form - Scrollable */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {error && (
                <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Basic Information */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Assessment Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input"
                      placeholder="My Security Assessment"
                    />
                  </div>

                  {/* Client */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Client Name
                    </label>
                    <input
                      type="text"
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      className="input"
                      placeholder="Acme Corp"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="input"
                    >
                      <option value="">Select category</option>
                      <option value="API">API</option>
                      <option value="Website">Website</option>
                      <option value="External Infra">External Infra</option>
                      <option value="Mobile">Mobile</option>
                      <option value="Cloud">Cloud</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  {/* Environment */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Environment
                    </label>
                    <select
                      value={formData.environment}
                      onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                      className="input"
                    >
                      <option value="non_specifie">Non spécifié</option>
                      <option value="production">Production</option>
                      <option value="dev">Dev</option>
                    </select>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="input"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      End Date / Deadline
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
              </div>

              {/* Target Information */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Target Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Target Domains */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Target Domains
                    </label>
                    <textarea
                      value={formData.target_domains}
                      onChange={(e) => setFormData({ ...formData, target_domains: e.target.value })}
                      rows={4}
                      className="input resize-none font-mono text-xs"
                      placeholder="example.com&#10;subdomain.example.com&#10;*.example.com"
                    />
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">One domain per line</p>
                  </div>

                  {/* IP Scopes */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      IP Scopes
                    </label>
                    <textarea
                      value={formData.ip_scopes}
                      onChange={(e) => setFormData({ ...formData, ip_scopes: e.target.value })}
                      rows={4}
                      className="input resize-none font-mono text-xs"
                      placeholder="192.168.1.0/24&#10;10.0.0.1-10.0.0.255&#10;172.16.0.1"
                    />
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">One range per line</p>
                  </div>
                </div>
              </div>

              {/* Scope & Objectives */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Scope & Objectives</h3>
                <div className="space-y-4">
                  {/* Scope */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Scope
                    </label>
                    <textarea
                      value={formData.scope}
                      onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                      rows={3}
                      className="input resize-none"
                      placeholder="Describe what is in scope for this assessment..."
                    />
                  </div>

                  {/* Objectives */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Objectives
                    </label>
                    <textarea
                      value={formData.objectives}
                      onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                      rows={3}
                      className="input resize-none"
                      placeholder="What are the goals of this assessment..."
                    />
                  </div>

                  {/* Limitations */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Limitations
                    </label>
                    <textarea
                      value={formData.limitations}
                      onChange={(e) => setFormData({ ...formData, limitations: e.target.value })}
                      rows={3}
                      className="input resize-none"
                      placeholder="Any restrictions or limitations..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="btn btn-primary"
              disabled={loading}
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditAssessmentModal;
