import { useState, useEffect, useMemo } from 'react';
import apiClient from '../../services/api';
import { decodeJWT, formatExpirationTime } from '../../utils/jwtDecoder';
import { Trash2, Copy, Eye, EyeOff, Plus, X, Edit2 } from '../icons';

// Group order: good → neutral → warning → bad
const STATUS_ORDER = { valid: 0, active: 1, expiring_soon: 2, expired: 3 };

const getCredentialStatus = (cred) => {
  const decoded = cred.credential_type === 'bearer_token' && cred.token
    ? decodeJWT(cred.token)
    : null;
  if (decoded?.valid && decoded.isExpired) return { key: 'expired', decoded };
  if (decoded?.valid && decoded.expiresIn < 1800) return { key: 'expiring_soon', decoded };
  if (decoded?.valid) return { key: 'valid', decoded };
  return { key: 'active', decoded: null };
};

const CredentialsManager = ({ assessmentId, onUpdate }) => {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCredential, setEditingCredential] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    loadCredentials();
  }, [assessmentId]);

  const loadCredentials = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/assessments/${assessmentId}/credentials`);
      setCredentials(response.data.credentials || []);
    } catch (error) {
      console.error('Failed to load credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedCredentials = useMemo(() => {
    return [...credentials].sort((a, b) => {
      const aOrder = STATUS_ORDER[getCredentialStatus(a).key];
      const bOrder = STATUS_ORDER[getCredentialStatus(b).key];
      return aOrder - bOrder;
    });
  }, [credentials]);

  const handleDelete = async (credentialId) => {
    if (!confirm('Are you sure you want to delete this credential?')) return;

    try {
      await apiClient.delete(`/credentials/${credentialId}`);
      await loadCredentials();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to delete credential:', error);
      alert('Failed to delete credential');
    }
  };

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const togglePasswordVisibility = (credId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [credId]: !prev[credId]
    }));
  };

  const openAddModal = () => {
    setEditingCredential(null);
    setShowModal(true);
  };

  const openEditModal = (cred) => {
    setEditingCredential(cred);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCredential(null);
  };

  const handleModalSuccess = async () => {
    await loadCredentials();
    if (onUpdate) onUpdate();
    closeModal();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Credentials & Authentication
          {credentials.length > 0 && (
            <span className="ml-2 text-xs font-normal text-neutral-500 dark:text-neutral-400">({credentials.length})</span>
          )}
        </h3>
        <button
          onClick={openAddModal}
          className="btn-ghost btn-xs"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      <div className="border border-neutral-200 dark:border-neutral-700 rounded overflow-hidden">
        {credentials.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-neutral-500 dark:text-neutral-400">
            No credentials stored yet
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300">Credential</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300">Type</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300">Status</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-neutral-700 dark:text-neutral-300">Expiration</th>
                <th className="px-3 py-2.5 w-20 text-xs font-semibold text-neutral-700 dark:text-neutral-300"></th>
              </tr>
            </thead>
            <tbody>
              {sortedCredentials.map((cred) => {
                const { key: statusKey, decoded } = getCredentialStatus(cred);
                const isExpired = statusKey === 'expired';

                let statusBadge = null;
                if (statusKey === 'expired') {
                  statusBadge = (
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full font-medium">
                      Expired
                    </span>
                  );
                } else if (statusKey === 'expiring_soon') {
                  statusBadge = (
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full font-medium">
                      Expiring Soon
                    </span>
                  );
                } else if (statusKey === 'valid') {
                  statusBadge = (
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-medium">
                      Valid
                    </span>
                  );
                } else {
                  statusBadge = (
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full font-medium">
                      Active
                    </span>
                  );
                }

                return (
                  <tr key={cred.id} className="border-b border-neutral-100 dark:border-neutral-700 last:border-b-0 hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">{cred.name}</span>
                        <div className="flex items-center gap-2">
                          <code className="text-[10px] font-mono text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded">
                            {cred.placeholder}
                          </code>
                          <button
                            onClick={() => handleCopy(cred.placeholder, `ph-${cred.id}`)}
                            className="text-neutral-400 dark:text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Copy placeholder"
                          >
                            {copiedField === `ph-${cred.id}` ? (
                              <span className="text-green-600 text-[10px] font-semibold">✓</span>
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-neutral-600 dark:text-neutral-300 capitalize">
                        {cred.credential_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {statusBadge}
                    </td>
                    <td className="px-3 py-3 text-neutral-500 dark:text-neutral-400 text-right">
                      {decoded?.valid && decoded.expDate ? (
                        <span className="text-xs">
                          {isExpired
                            ? `${formatExpirationTime(Math.abs(decoded.expiresIn))} ago`
                            : `${formatExpirationTime(decoded.expiresIn)}`
                          }
                        </span>
                      ) : (
                        <span className="text-neutral-300 dark:text-neutral-600">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 w-20">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEditModal(cred)}
                          className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-neutral-400 dark:text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cred.id)}
                          className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-neutral-400 dark:text-neutral-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <CredentialModal
          assessmentId={assessmentId}
          credential={editingCredential}
          onClose={closeModal}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

// Modal Component for Add/Edit
const CredentialModal = ({ assessmentId, credential, onClose, onSuccess }) => {
  const isEditing = !!credential;

  const [formData, setFormData] = useState({
    credential_type: credential?.credential_type || 'bearer_token',
    name: credential?.name || '',
    token: credential?.token || '',
    username: credential?.username || '',
    password: credential?.password || '',
    cookie_value: credential?.cookie_value || '',
    service: credential?.service || '',
    target: credential?.target || '',
    notes: credential?.notes || ''
  });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const generatePlaceholder = (name, type) => {
    if (!name) return '';
    const cleanName = name.toUpperCase().replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g, '_');
    const typePrefix = type.toUpperCase().replace('_', '_');
    return `{{${typePrefix}_${cleanName}}}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const placeholder = generatePlaceholder(formData.name, formData.credential_type);

      const data = {
        credential_type: formData.credential_type,
        name: formData.name,
        placeholder: placeholder,
        discovered_by: 'manual'
      };

      // Add type-specific fields
      if (formData.credential_type === 'bearer_token' || formData.credential_type === 'api_key') {
        if (formData.token) data.token = formData.token;
      } else if (formData.credential_type === 'cookie') {
        if (formData.cookie_value) data.cookie_value = formData.cookie_value;
      } else if (formData.credential_type === 'basic_auth' || formData.credential_type === 'ssh') {
        if (formData.username) data.username = formData.username;
        if (formData.password) data.password = formData.password;
      }

      if (formData.service) data.service = formData.service;
      if (formData.target) data.target = formData.target;
      if (formData.notes) data.notes = formData.notes;

      if (isEditing) {
        await apiClient.patch(`/credentials/${credential.id}`, data);
      } else {
        await apiClient.post(`/assessments/${assessmentId}/credentials`, data);
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to save credential:', error);
      alert(error.response?.data?.detail || 'Failed to save credential');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between sticky top-0 bg-white dark:bg-neutral-800">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {isEditing ? 'Edit Credential' : 'Add Credential'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Type *
            </label>
            <select
              value={formData.credential_type}
              onChange={(e) => setFormData({ ...formData, credential_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="bearer_token">Bearer Token</option>
              <option value="api_key">API Key</option>
              <option value="cookie">Cookie</option>
              <option value="basic_auth">Basic Auth</option>
              <option value="ssh">SSH</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Fleet Manager Auth"
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
            {formData.name && (
              <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                Placeholder: <code className="bg-gray-100 dark:bg-neutral-700 px-1 rounded font-mono">{generatePlaceholder(formData.name, formData.credential_type)}</code>
              </p>
            )}
          </div>

          {/* Conditional Fields */}
          {(formData.credential_type === 'bearer_token' || formData.credential_type === 'api_key') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                Token *
              </label>
              <textarea
                value={formData.token}
                onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-xs"
                required
              />
            </div>
          )}

          {formData.credential_type === 'cookie' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                Cookie Value *
              </label>
              <textarea
                value={formData.cookie_value}
                onChange={(e) => setFormData({ ...formData, cookie_value: e.target.value })}
                placeholder="session=abc123..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-xs"
                required
              />
            </div>
          )}

          {(formData.credential_type === 'basic_auth' || formData.credential_type === 'ssh') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="admin"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Optional fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                Service
              </label>
              <input
                type="text"
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                placeholder="API"
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                Target
              </label>
              <input
                type="text"
                value={formData.target}
                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                placeholder="https://api.example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional information..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving...' : isEditing ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CredentialsManager;
