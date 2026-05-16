import { useState, useEffect } from 'react';
import { X, Folder, Palette, Edit3, Trash2 } from 'lucide-react';
import folderService from '../../services/folderService';

const EditFolderModal = ({ folder, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#06b6d4'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const predefinedColors = [
    '#06b6d4', // cyan
    '#10b981', // emerald
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#f59e0b', // amber
    '#ef4444', // red
    '#6b7280', // gray
    '#84cc16', // lime
  ];

  useEffect(() => {
    if (folder) {
      setFormData({
        name: folder.name || '',
        description: folder.description || '',
        color: folder.color || '#06b6d4'
      });
    }
  }, [folder]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await folderService.updateFolder(folder.id, formData);
      onSuccess();
      onClose(); // Close modal after successful update
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update folder');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete the folder "${folder.name}"? All assessments in this folder will be moved to "No Folder".`)) {
      return;
    }

    try {
      setError('');
      setLoading(true);

      await folderService.deleteFolder(folder.id);
      onSuccess();
      onClose(); // Close modal after successful deletion
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete folder');
    } finally {
      setLoading(false);
    }
  };

  if (!folder) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/70 backdrop-blur-sm z-50 animate-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-xl shadow-strong animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Edit Folder</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors"
            >
              <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Folder Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Pentests 2025"
                className="input"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Folder for all 2025 penetration tests"
                rows={2}
                className="input resize-none"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Color
              </label>
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color
                          ? 'border-neutral-400 dark:border-neutral-500 scale-110'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                        }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-8 h-8 rounded border border-neutral-200 dark:border-neutral-700 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4" style={{ color: formData.color }} />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {formData.name || 'Folder Name'}
                </span>
              </div>
              {formData.description && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{formData.description}</p>
              )}
            </div>

            {/* Footer - Inside form for proper submit handling */}
            <div className="flex items-center justify-between pt-5 -mx-6 -mb-6 px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
              <button
                type="button"
                onClick={handleDelete}
                className="btn btn-secondary flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-300 dark:border-red-600"
                disabled={loading}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  <Edit3 className="w-4 h-4" />
                  {loading ? 'Updating...' : 'Update Folder'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default EditFolderModal;