import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, Clock, User, Target, Search, FolderPlus, X } from '../components/icons';
import apiClient from '../services/api';
import folderService from '../services/folderService';
import CreateAssessmentModal from '../components/assessment/CreateAssessmentModal';
import EditAssessmentModal from '../components/assessment/EditAssessmentModal';
import CreateFolderModal from '../components/common/CreateFolderModal';
import EditFolderModal from '../components/common/EditFolderModal';
import AssessmentsTable from '../components/common/AssessmentsTable';
import SidebarLayout from '../components/common/SidebarLayout';
import { useWebSocketContext } from '../contexts/WebSocketContext';

const Assessments = () => {
  const [assessments, setAssessments] = useState([]);
  const [allAssessments, setAllAssessments] = useState([]); // For accurate counting
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditAssessmentModalOpen, setIsEditAssessmentModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('active'); // 'active', 'completed', 'archived', or folder ID
  const [actionLoading, setActionLoading] = useState(false);
  const searchInputRef = useRef(null);

  // WebSocket for real-time updates
  const { subscribe } = useWebSocketContext();

  useEffect(() => {
    loadData();
  }, []);

  // Subscribe to WebSocket events for real-time updates
  useEffect(() => {
    // Assessment created
    const unsubscribeCreated = subscribe('assessment_created', (data) => {

      setAssessments(prev => [data.assessment, ...prev]);
      setAllAssessments(prev => [data.assessment, ...prev]);
    });

    // Assessment updated
    const unsubscribeUpdated = subscribe('assessment_updated', (data) => {

      setAssessments(prev => prev.map(a =>
        a.id === data.assessment_id ? { ...a, ...data.fields } : a
      ));
      setAllAssessments(prev => prev.map(a =>
        a.id === data.assessment_id ? { ...a, ...data.fields } : a
      ));
    });

    // Assessment deleted
    const unsubscribeDeleted = subscribe('assessment_deleted', (data) => {

      setAssessments(prev => prev.filter(a => a.id !== data.assessment_id));
      setAllAssessments(prev => prev.filter(a => a.id !== data.assessment_id));
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, [subscribe]);

  // Handle Escape key to clear search
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [foldersData, allAssessmentsData] = await Promise.all([
        folderService.getFolders(),
        apiClient.get('/assessments')
      ]);
      setFolders(foldersData);
      setAllAssessments(allAssessmentsData.data);

      // Load assessments for the default view (active)
      const activeData = await apiClient.get('/assessments?status=active');
      setAssessments(activeData.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssessmentsForView = useCallback(async () => {
    try {
      let assessmentsData;

      if (activeView === 'active') {
        // Active assessments (default view)
        assessmentsData = await apiClient.get('/assessments?status=active');
      } else if (activeView === 'completed') {
        // Completed assessments
        assessmentsData = await apiClient.get('/assessments?status=completed');
      } else if (activeView === 'archived') {
        // Archived assessments
        assessmentsData = await apiClient.get('/assessments?status=archived');
      } else {
        // Custom folder - activeView is the folder ID as string
        const folder = folders.find(f => f.id.toString() === activeView);
        if (folder) {
          assessmentsData = await folderService.getAssessmentsByFolder(folder.id);
        } else {
          assessmentsData = { data: [] };
        }
      }

      setAssessments(assessmentsData.data || assessmentsData);
    } catch (error) {
      console.error('Failed to load assessments for view:', error);
    }
  }, [activeView, folders]);

  // Trigger reload when view changes
  useEffect(() => {
    loadAssessmentsForView();
  }, [loadAssessmentsForView]);

  const handleAssessmentUpdate = async () => {
    try {
      setActionLoading(true);
      // Reload all assessments for accurate counting
      const allAssessmentsData = await apiClient.get('/assessments');
      setAllAssessments(allAssessmentsData.data);
      // Reload current view
      await loadAssessmentsForView();
      // Clear editing state to force refresh on next edit
      setEditingAssessment(null);
    } catch (error) {
      console.error('Failed to update assessments:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssessmentDelete = async (assessmentId) => {
    try {
      await apiClient.delete(`/assessments/${assessmentId}`);
      await handleAssessmentUpdate();
    } catch (error) {
      console.error('Failed to delete assessment:', error);
    }
  };

  const handleEditAssessment = (assessment) => {
    // Find the fresh version from the current assessments list
    const freshAssessment = assessments.find(a => a.id === assessment.id) || assessment;
    setEditingAssessment(freshAssessment);
    setIsEditAssessmentModalOpen(true);
  };

  const handleEditFolder = (folder) => {
    setEditingFolder(folder);
    setIsEditFolderModalOpen(true);
  };

  const handleFolderUpdate = async () => {
    // Reload folders and assessments
    const foldersData = await folderService.getFolders();
    setFolders(foldersData);
    // Reload all assessments for accurate counting
    const allAssessmentsData = await apiClient.get('/assessments');
    setAllAssessments(allAssessmentsData.data);
    // Reload current view
    await loadAssessmentsForView();
  };

  // When search is active, search across ALL assessments (not just the current view)
  const filteredAssessments = searchQuery
    ? allAssessments.filter((assessment) =>
        assessment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assessment.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : assessments;

  // Get current view name
  const getCurrentViewName = () => {
    if (activeView === 'active') return 'Active';
    if (activeView === 'completed') return 'Completed';
    if (activeView === 'archived') return 'Archived';

    // Find custom folder
    const folder = folders.find(f => f.id.toString() === activeView);
    return folder ? folder.name : 'Unknown Folder';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-primary-100 text-primary-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'archived':
        return 'bg-neutral-100 text-neutral-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-neutral-500 dark:text-neutral-400">Loading assessments...</div>
      </div>
    );
  }

  return (
    <div className="-m-6 h-[calc(100vh-56px)]">
      <SidebarLayout
        folders={folders}
        allAssessments={allAssessments}
        activeView={activeView}
        onViewChange={setActiveView}
        onCreateFolder={() => setIsCreateFolderModalOpen(true)}
        onEditFolder={handleEditFolder}
        className="h-full"
      >
        <div className="space-y-6 animate-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Assessments</h1>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                Manage your security assessments and penetration tests
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus className="w-4 h-4" />
              New Assessment
            </button>
          </div>

          {/* Current View Info */}
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {searchQuery ? 'Search results' : getCurrentViewName()}
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {filteredAssessments.length} assessment{filteredAssessments.length !== 1 ? 's' : ''}
                  {searchQuery && ` across all views`}
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search all assessments..."
                  className="input pl-9 pr-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                    title="Clear search (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded">
                  Searching all assessments
                </span>
              )}
            </div>
          </div>

          {/* Assessments Table */}
          <AssessmentsTable
            assessments={filteredAssessments}
            folders={folders}
            onAssessmentUpdate={handleAssessmentUpdate}
            onAssessmentDelete={handleAssessmentDelete}
            onAssessmentEdit={handleEditAssessment}
            loading={actionLoading}
          />
        </div>

        {/* Create Assessment Modal */}
        {isCreateModalOpen && (
          <CreateAssessmentModal
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={async () => {
              setIsCreateModalOpen(false);
              // Reload all assessments for accurate counting
              const allAssessmentsData = await apiClient.get('/assessments');
              setAllAssessments(allAssessmentsData.data);
              // Reload current view
              await loadAssessmentsForView();
            }}
          />
        )}

        {/* Create Folder Modal */}
        {isCreateFolderModalOpen && (
          <CreateFolderModal
            onClose={() => setIsCreateFolderModalOpen(false)}
            onSuccess={handleFolderUpdate}
          />
        )}

        {/* Edit Assessment Modal */}
        {isEditAssessmentModalOpen && editingAssessment && (
          <EditAssessmentModal
            assessment={editingAssessment}
            onClose={() => {
              setIsEditAssessmentModalOpen(false);
              setEditingAssessment(null);
            }}
            onSuccess={handleAssessmentUpdate}
          />
        )}

        {/* Edit Folder Modal */}
        {isEditFolderModalOpen && editingFolder && (
          <EditFolderModal
            folder={editingFolder}
            onClose={() => {
              setIsEditFolderModalOpen(false);
              setEditingFolder(null);
            }}
            onSuccess={handleFolderUpdate}
          />
        )}
      </SidebarLayout>
    </div>
  );
};

export default Assessments;
