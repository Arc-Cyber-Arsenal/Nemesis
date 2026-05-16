import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Folder, Copy, Trash2, Share, FileText } from 'lucide-react';

const ContextMenu = ({ 
  isOpen, 
  onClose, 
  position = { x: 0, y: 0 }, 
  onMoveToFolder, 
  onDuplicate, 
  onDelete, 
  onExport,
  onShare,
  folders = [],
  assessment = null
}) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleMoveToFolder = (folderId) => {
    onMoveToFolder(folderId);
    onClose();
  };

  const handleAction = (action) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-2 min-w-[200px]"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* Move to Folder - Only custom folders */}
      {folders.filter(folder => !folder.is_system).length > 0 && (
        <div className="px-2">
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 px-3 py-2">
            Move to Folder
          </div>
          <button
            onClick={() => handleMoveToFolder(null)}
            className="w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2 rounded"
          >
            <Folder className="w-4 h-4" />
            No Folder
          </button>
          {folders.filter(folder => !folder.is_system).map((folder) => (
            <button
              key={folder.id}
              onClick={() => handleMoveToFolder(folder.id)}
              className="w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2 rounded"
            >
              <Folder className="w-4 h-4" style={{ color: folder.color }} />
              {folder.name}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-neutral-100 dark:border-neutral-700 my-1"></div>

      {/* Actions */}
      <div className="px-2">
        <button
          onClick={() => handleAction(onDuplicate)}
          className="w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2 rounded"
        >
          <Copy className="w-4 h-4" />
          Duplicate Assessment
        </button>

        <button
          onClick={() => handleAction(onDelete)}
          className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 rounded"
        >
          <Trash2 className="w-4 h-4" />
          Delete Assessment
        </button>
      </div>

      <div className="border-t border-neutral-100 dark:border-neutral-700 my-1"></div>

      {/* Additional Actions */}
      <div className="px-2">
        <button
          onClick={() => handleAction(onExport)}
          className="w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2 rounded"
        >
          <FileText className="w-4 h-4" />
          Export Report
        </button>

        <button
          onClick={() => handleAction(onShare)}
          className="w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2 rounded"
        >
          <Share className="w-4 h-4" />
          Share Assessment
        </button>
      </div>
    </div>
  );
};

export default ContextMenu;
