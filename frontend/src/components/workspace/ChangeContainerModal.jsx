import { useState, useEffect } from 'react';
import { Server, AlertTriangle, CheckCircle } from '../icons';
import apiClient from '../../services/api';
import Modal from '../common/Modal';
import Button from '../common/Button';

/**
 * ChangeContainerModal - Modal to change the container for an assessment
 *
 * Allows user to:
 * 1. View current container
 * 2. Select a new container from available Exegol containers
 * 3. Understand the impact (workspace recreation)
 * 4. Confirm the change
 */
const ChangeContainerModal = ({ assessment, onClose, onSuccess }) => {
  const [containers, setContainers] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState(assessment?.container_name || '');
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadContainers();
  }, []);

  const loadContainers = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/system/exegol/containers');
      setContainers(response.data.containers || []);

      if (!selectedContainer && response.data.current) {
        setSelectedContainer(response.data.current);
      }
    } catch (err) {
      console.error('Failed to load containers:', err);
      setError('Failed to load containers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async () => {
    if (!selectedContainer || selectedContainer === assessment.container_name) {
      return;
    }

    setChanging(true);
    setError(null);

    try {
      const response = await apiClient.put(`/assessments/${assessment.id}/container`, {
        container_name: selectedContainer
      });

      if (response.data.success) {
        onSuccess(response.data);
      } else {
        setError(response.data.error || 'Failed to change container');
      }
    } catch (err) {
      console.error('Failed to change container:', err);
      setError(err.response?.data?.detail || 'Failed to change container');
    } finally {
      setChanging(false);
    }
  };

  const hasChanged = selectedContainer !== assessment.container_name;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Change Assessment Container"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleChange}
            disabled={!hasChanged || changing || loading}
          >
            {changing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Changing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Change Container
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
          {/* Current Container */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Current Container
            </label>
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-700 rounded border border-neutral-200 dark:border-neutral-600">
              <Server className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              <span className="font-mono text-sm text-neutral-900 dark:text-neutral-100">
                {assessment.container_name || 'Not set'}
              </span>
            </div>
          </div>

          {/* Container Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Select New Container
            </label>

            {loading ? (
              <div className="flex items-center justify-center p-4 text-sm text-neutral-500 dark:text-neutral-400">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
                Loading containers...
              </div>
            ) : error ? (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            ) : containers.length === 0 ? (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded text-sm text-yellow-700 dark:text-yellow-400">
                No Exegol containers detected. Make sure Docker is running.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {containers.map((container) => (
                  <label
                    key={container.id}
                    className={`flex items-center justify-between p-3 border-2 rounded cursor-pointer transition-colors ${
                      selectedContainer === container.name
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="radio"
                        name="container"
                        value={container.name}
                        checked={selectedContainer === container.name}
                        onChange={(e) => setSelectedContainer(e.target.value)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {container.name}
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {container.image} • {container.id}
                        </div>
                      </div>
                      <div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          container.status === 'running'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                        }`}>
                          {container.status}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Warning about changes */}
          {hasChanged && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <div className="font-medium mb-1">This will:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    <li>Update the assessment's container to <span className="font-mono font-medium">{selectedContainer}</span></li>
                    <li>Recreate the workspace in the new container</li>
                    <li>All future commands will run in the new container</li>
                    <li>You may need to re-import reconnaissance data</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
      </div>
    </Modal>
  );
};

export default ChangeContainerModal;
