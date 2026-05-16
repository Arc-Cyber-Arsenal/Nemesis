import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import GlobalSearch from '../common/GlobalSearch';
import { useState } from 'react';

const MainLayout = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Sidebar - Auto-collapse */}
      <div className="fixed left-0 top-0 bottom-0 z-50">
        <Sidebar onToggle={setSidebarExpanded} />
      </div>

      {/* Main content - Dynamic padding */}
      <div className={`transition-all duration-300 ${sidebarExpanded ? 'pl-64' : 'pl-16'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-40 h-14 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between px-6">
          <div className="flex-1 max-w-2xl">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-3">
            {/* Dev mode indicator — only visible in development builds */}
            {import.meta.env.MODE === 'development' && (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-700 select-none">
                DEV
              </span>
            )}
            {/* Quick actions */}
            <button className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
              ⌘K to search
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;

