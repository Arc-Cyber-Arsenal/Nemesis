import { useState, useRef } from 'react';
import { MoreVertical, Check } from 'lucide-react';
import ContextMenu from './ContextMenu';
import DuplicateAssessmentModal from '../assessment/DuplicateAssessmentModal';
import folderService from '../../services/folderService';
import apiClient from '../../services/api';

const AssessmentCardActions = ({
  assessment,
  folders = [],
  onAssessmentUpdate,
  onAssessmentDelete
}) => {
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const buttonRef = useRef(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const handleMenuClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({
      x: rect.right - 200, // Position menu to the left of button
      y: rect.bottom + 5
    });
    setIsContextMenuOpen(true);
  };

  const handleMoveToFolder = async (folderId) => {
    try {
      await folderService.moveAssessment(assessment.id, folderId);
      onAssessmentUpdate();
    } catch (error) {
      console.error('Failed to move assessment:', error);
    }
  };

  const handleDuplicate = () => {
    setIsContextMenuOpen(false);
    setIsDuplicateModalOpen(true);
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${assessment.name}"? This action cannot be undone.`)) {
      try {
        // Call the delete function passed from parent
        onAssessmentDelete(assessment.id);
      } catch (error) {
        console.error('Failed to delete assessment:', error);
      }
    }
  };

  const handleExport = async () => {
    if (exportingPdf) return;
    setIsContextMenuOpen(false);
    setExportingPdf(true);
    try {
      const response = await apiClient.get(`/assessments/${assessment.id}/report/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const safeName = assessment.name.replace(/[^a-zA-Z0-9]/g, '_');
      const a = document.createElement('a');
      a.href = url;
      a.download = `AIDA_Report_${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      showToast('Failed to export report');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleShare = async () => {
    setIsContextMenuOpen(false);
    const link = `${window.location.origin}/assessments/${assessment.id}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast('Link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy link:', error);
      showToast('Failed to copy link');
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleMenuClick}
        className="p-1 rounded-md hover:bg-neutral-100 transition-colors opacity-0 group-hover:opacity-100"
        title="More actions"
      >
        <MoreVertical className="w-4 h-4 text-neutral-400" />
      </button>

      <ContextMenu
        isOpen={isContextMenuOpen}
        onClose={() => setIsContextMenuOpen(false)}
        position={menuPosition}
        onMoveToFolder={handleMoveToFolder}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onExport={handleExport}
        onShare={handleShare}
        folders={folders}
        assessment={assessment}
      />

      <DuplicateAssessmentModal
        assessment={assessment}
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        onSuccess={onAssessmentUpdate}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm shadow-lg animate-in">
          <Check className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}
    </>
  );
};

export default AssessmentCardActions;
