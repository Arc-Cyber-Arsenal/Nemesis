import FolderSidebar from './FolderSidebar';

const SidebarLayout = ({
  children,
  folders = [],
  allAssessments = [],
  activeView,
  onViewChange,
  onCreateFolder,
  onEditFolder,
  className = ""
}) => {
  return (
    <div className={`flex h-full ${className}`}>
      {/* Folder Sidebar - Seamless with Main Sidebar */}
      <div className="flex-shrink-0 w-64">
        <FolderSidebar
          folders={folders}
          allAssessments={allAssessments}
          activeView={activeView}
          onViewChange={onViewChange}
          onCreateFolder={onCreateFolder}
          onEditFolder={onEditFolder}
          className="h-full"
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-neutral-50 dark:bg-neutral-900">
        <div className="p-6 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SidebarLayout;
