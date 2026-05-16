import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, FileText, RefreshCw, AlertCircle, Folder } from 'lucide-react';
import { listMarkdownFiles, getMarkdownContent } from '../../services/markdownService';
import MarkdownRenderer from '../common/MarkdownRenderer';

const MarkdownDocumentsModal = ({ assessmentId, onClose }) => {
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [contentLoading, setContentLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadFiles();
    }, [assessmentId]);

    useEffect(() => {
        // Close modal on ESC key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const loadFiles = async () => {
        try {
            setLoading(true);
            setError(null);
            const markdownFiles = await listMarkdownFiles(assessmentId);
            setFiles(markdownFiles);

            // Auto-select first file if available
            if (markdownFiles.length > 0) {
                loadFileContent(markdownFiles[0].path);
                setSelectedFile(markdownFiles[0].path);
            }
        } catch (err) {
            console.error('Failed to load markdown files:', err);
            setError(err.response?.data?.detail || 'Failed to load markdown files');
        } finally {
            setLoading(false);
        }
    };

    const loadFileContent = async (filePath) => {
        try {
            setContentLoading(true);
            const data = await getMarkdownContent(assessmentId, filePath);
            setContent(data.content);
            setSelectedFile(filePath);
        } catch (err) {
            console.error('Failed to load file content:', err);
            setError(err.response?.data?.detail || 'Failed to load file content');
        } finally {
            setContentLoading(false);
        }
    };

    const handleFileClick = (filePath) => {
        if (filePath !== selectedFile) {
            loadFileContent(filePath);
        }
    };

    // Group files by folder
    const filesByFolder = files.reduce((acc, file) => {
        if (!acc[file.folder]) {
            acc[file.folder] = [];
        }
        acc[file.folder].push(file);
        return acc;
    }, {});

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative w-full h-full max-w-[95vw] max-h-[95vh] bg-white dark:bg-neutral-900 rounded-xl shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                    <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary-500" />
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                            Markdown Documents
                        </h2>
                        {files.length > 0 && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-full">
                                {files.length}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadFiles}
                            disabled={loading}
                            className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 text-neutral-600 dark:text-neutral-300 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors"
                            title="Close (ESC)"
                        >
                            <X className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center w-full h-full">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading documents...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center w-full h-full">
                            <div className="flex flex-col items-center gap-3 max-w-md text-center">
                                <AlertCircle className="w-12 h-12 text-red-500" />
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                <button
                                    onClick={loadFiles}
                                    className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-md transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    ) : files.length === 0 ? (
                        <div className="flex items-center justify-center w-full h-full">
                            <div className="flex flex-col items-center gap-3 text-center">
                                <FileText className="w-12 h-12 text-neutral-300 dark:text-neutral-600" />
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">No markdown documents found</p>
                                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                                    Markdown files (.md) will appear here when created in the workspace
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Sidebar - File List */}
                            <div className="w-64 border-r border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 overflow-y-auto">
                                <div className="p-3 space-y-1">
                                    {Object.keys(filesByFolder).sort().map((folder) => (
                                        <div key={folder} className="mb-4">
                                            {/* Folder Header */}
                                            <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                                <Folder className="w-3.5 h-3.5" />
                                                <span>{folder}</span>
                                            </div>
                                            {/* Files in Folder */}
                                            {filesByFolder[folder].map((file) => (
                                                <button
                                                    key={file.path}
                                                    onClick={() => handleFileClick(file.path)}
                                                    className={`w-full flex items-start gap-2 px-3 py-2 text-left text-sm rounded-md transition-colors ${selectedFile === file.path
                                                            ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-medium'
                                                            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                                                        }`}
                                                    title={`${file.path} (${file.size_human})`}
                                                >
                                                    <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="truncate">{file.filename}</div>
                                                        <div className="text-xs text-neutral-500 dark:text-neutral-500">{file.size_human}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-y-auto bg-white dark:bg-neutral-900">
                                {contentLoading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading content...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 max-w-5xl mx-auto">
                                        <MarkdownRenderer content={content} />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

MarkdownDocumentsModal.propTypes = {
    assessmentId: PropTypes.number.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default MarkdownDocumentsModal;
