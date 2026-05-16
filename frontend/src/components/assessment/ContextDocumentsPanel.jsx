/**
 * Context Documents Panel - merged with Source Code import.
 *
 * Files tab  : upload any file → /context/  (ZIP with .git/ auto-routed to /source/)
 * Git Clone tab : clone a repo   → /source/
 * Source list is shown inside the same panel when repos exist.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Upload, X, GitBranch, RefreshCw, Code, CheckCircle } from 'lucide-react';
import {
    uploadContextDocument,
    listContextDocuments,
    deleteContextDocument,
} from '../../services/contextService';
import {
    detectBranches,
    cloneRepository,
    listSourceCode,
    deleteSourceCode,
} from '../../services/sourceCodeService';

const ContextDocumentsPanel = ({ assessmentId }) => {
    const [activeTab, setActiveTab] = useState('files');

    // Context files state
    const [documents, setDocuments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    // Source code (git) state
    const [sourceEntries, setSourceEntries] = useState([]);
    const [gitUrl, setGitUrl] = useState('');
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [shallowClone, setShallowClone] = useState(true);
    const [detectingBranches, setDetectingBranches] = useState(false);
    const [cloning, setCloning] = useState(false);
    const [cloneElapsed, setCloneElapsed] = useState(0);
    const [branchError, setBranchError] = useState('');
    const [cloneError, setCloneError] = useState('');

    // Success notification (auto-dismiss)
    const [successMsg, setSuccessMsg] = useState('');
    const successTimer = useRef(null);
    const cloneTimerRef = useRef(null);

    const showSuccess = (msg) => {
        setSuccessMsg(msg);
        clearTimeout(successTimer.current);
        successTimer.current = setTimeout(() => setSuccessMsg(''), 4000);
    };

    // ── Data loading ──────────────────────────────────────────────────────────

    const loadDocuments = useCallback(async () => {
        try {
            const docs = await listContextDocuments(assessmentId);
            setDocuments(docs);
        } catch (err) {
            console.error('Failed to load context documents:', err);
        }
    }, [assessmentId]);

    const loadSourceEntries = useCallback(async () => {
        try {
            const data = await listSourceCode(assessmentId);
            setSourceEntries(data);
        } catch (err) {
            console.error('Failed to load source entries:', err);
        }
    }, [assessmentId]);

    useEffect(() => {
        loadDocuments();
        loadSourceEntries();
        return () => {
            clearTimeout(successTimer.current);
            clearInterval(cloneTimerRef.current);
        };
    }, [loadDocuments, loadSourceEntries]);

    // Elapsed timer during git clone
    useEffect(() => {
        if (cloning) {
            setCloneElapsed(0);
            cloneTimerRef.current = setInterval(() => setCloneElapsed(s => s + 1), 1000);
        } else {
            clearInterval(cloneTimerRef.current);
        }
    }, [cloning]);

    // ── Files tab handlers ────────────────────────────────────────────────────

    const handleFileSelect = async (files) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            const file = files[0];
            const result = await uploadContextDocument(assessmentId, file);
            // ZIP with .git was routed to /source — refresh both lists
            if (result?.routed_to === 'source') {
                await loadSourceEntries();
                showSuccess(`"${result.name}" detected as a git repo → extracted to /source/`);
            } else {
                await loadDocuments();
                showSuccess(`"${result?.filename || file.name}" uploaded`);
            }
        } catch (err) {
            alert(err.response?.data?.detail || err.message || 'Upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(e.type === 'dragenter' || e.type === 'dragover');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files?.length > 0) handleFileSelect(e.dataTransfer.files);
    };

    const handleDeleteDoc = async (filename) => {
        if (!window.confirm(`Delete ${filename}?`)) return;
        try {
            await deleteContextDocument(assessmentId, filename);
            await loadDocuments();
        } catch (err) {
            alert(err.response?.data?.detail || 'Delete failed');
        }
    };

    // ── Git Clone tab handlers ────────────────────────────────────────────────

    const handleDetectBranches = async () => {
        if (!gitUrl.trim()) return;
        setBranchError('');
        setBranches([]);
        setSelectedBranch('');
        setDetectingBranches(true);
        try {
            const result = await detectBranches(assessmentId, gitUrl.trim());
            setBranches(result.branches);
            if (result.branches.length > 0) {
                const preferred = ['main', 'master'];
                const def = preferred.find(b => result.branches.includes(b)) || result.branches[0];
                setSelectedBranch(def);
            } else {
                setBranchError('No branches found');
            }
        } catch (err) {
            setBranchError(err.response?.data?.detail || 'Could not reach repository');
        } finally {
            setDetectingBranches(false);
        }
    };

    const handleClone = async () => {
        if (!gitUrl.trim()) return;
        setCloneError('');
        setCloning(true);
        try {
            const result = await cloneRepository(assessmentId, gitUrl.trim(), selectedBranch || null, shallowClone);
            setGitUrl('');
            setBranches([]);
            setSelectedBranch('');
            await loadSourceEntries();
            showSuccess(`"${result.name}" cloned successfully`);
        } catch (err) {
            setCloneError(err.response?.data?.detail || err.message || 'Clone failed');
        } finally {
            setCloning(false);
        }
    };

    const handleDeleteSource = async (name) => {
        if (!window.confirm(`Delete source code directory "${name}"?`)) return;
        try {
            await deleteSourceCode(assessmentId, name);
            await loadSourceEntries();
        } catch (err) {
            alert(err.response?.data?.detail || 'Delete failed');
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    Context Documents
                    {documents.length > 0 && (
                        <span className="ml-2 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                            ({documents.length})
                        </span>
                    )}
                </h3>
            </div>

            {/* Success notification */}
            {successMsg && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded border
                    bg-emerald-50 dark:bg-emerald-900/20
                    border-emerald-200 dark:border-emerald-800
                    text-emerald-800 dark:text-emerald-300 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    {successMsg}
                </div>
            )}

            <div className="border border-neutral-200 dark:border-neutral-700 rounded overflow-hidden">

                {/* Tab bar */}
                <div className="flex border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                    {[
                        { id: 'files', label: 'Files', Icon: Upload },
                        { id: 'git', label: 'Git Clone', Icon: GitBranch },
                    ].map(({ id, label, Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === id
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-neutral-800'
                                : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                                }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                        </button>
                    ))}
                </div>

                {/* ── Files tab ─────────────────────────────────────────────── */}
                {activeTab === 'files' && (
                    <>
                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            className={`border-b border-neutral-200 dark:border-neutral-700 p-4 text-center transition-colors ${dragActive
                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                : 'bg-neutral-50/50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                                className="sr-only"
                                id="context-file-upload"
                                disabled={uploading}
                            />
                            <label htmlFor="context-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                <Upload className={`w-5 h-5 ${dragActive ? 'text-blue-600' : 'text-neutral-400'}`} />
                                <div>
                                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                                        {uploading ? 'Uploading…' : dragActive ? 'Drop file here' : 'Click to upload or drag and drop'}
                                    </p>
                                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                                        PDF, TXT, JSON, YAML, Images, ZIP (max 200MB — ZIP with git auto-routed to /source/)
                                    </p>
                                </div>
                            </label>
                            {uploading && (
                                <div className="mt-2">
                                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                                </div>
                            )}
                        </div>

                        {/* Context files list */}
                        {documents.length > 0 ? (
                            <table className="w-full text-xs">
                                <tbody>
                                    {documents.map((doc) => (
                                        <tr
                                            key={doc.filename}
                                            className="border-b border-neutral-100 dark:border-neutral-700 last:border-b-0 hover:bg-neutral-50/50 dark:hover:bg-neutral-700/50"
                                        >
                                            <td className="px-3 py-2">
                                                <p className="font-mono text-neutral-900 dark:text-neutral-100">{doc.filename}</p>
                                                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{doc.type} • {doc.size_human}</p>
                                            </td>
                                            <td className="px-2 py-2 w-px">
                                                <button
                                                    onClick={() => handleDeleteDoc(doc.filename)}
                                                    className="p-0.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-neutral-300 dark:text-neutral-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                                    title="Delete"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="px-3 py-4 text-center text-xs text-neutral-500 dark:text-neutral-400">
                                No context documents uploaded yet
                            </div>
                        )}
                    </>
                )}

                {/* ── Git Clone tab ──────────────────────────────────────────── */}
                {activeTab === 'git' && (
                    <div className="p-4 space-y-3 bg-white dark:bg-neutral-800">
                        {/* URL + branch detect */}
                        <div>
                            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                                Repository URL (HTTPS)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={gitUrl}
                                    onChange={(e) => {
                                        setGitUrl(e.target.value);
                                        setBranches([]);
                                        setSelectedBranch('');
                                        setBranchError('');
                                        setCloneError('');
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleDetectBranches()}
                                    placeholder="https://github.com/user/repo.git"
                                    className="flex-1 px-3 py-1.5 text-xs font-mono bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={cloning}
                                />
                                <button
                                    onClick={handleDetectBranches}
                                    disabled={!gitUrl.trim() || detectingBranches || cloning}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {detectingBranches
                                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        : <GitBranch className="w-3.5 h-3.5" />}
                                    {detectingBranches ? 'Detecting…' : 'Branches'}
                                </button>
                            </div>
                            {branchError && (
                                <p className="mt-1 text-[10px] text-red-500 dark:text-red-400">{branchError}</p>
                            )}
                        </div>

                        {/* Branch selector */}
                        {branches.length > 0 && (
                            <div>
                                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Branch</label>
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    disabled={cloning}
                                >
                                    {branches.map((b) => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Shallow clone */}
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={shallowClone}
                                onChange={(e) => setShallowClone(e.target.checked)}
                                disabled={cloning}
                                className="w-3 h-3 rounded accent-blue-600"
                            />
                            <span className="text-[11px] text-neutral-600 dark:text-neutral-400">
                                Shallow clone <span className="text-neutral-400 dark:text-neutral-500">(faster, no history)</span>
                            </span>
                        </label>

                        {/* Clone button */}
                        <button
                            onClick={handleClone}
                            disabled={!gitUrl.trim() || cloning}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {cloning ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    Cloning… {cloneElapsed > 0 && `(${cloneElapsed}s)`}
                                </>
                            ) : (
                                <>
                                    <Code className="w-3.5 h-3.5" />
                                    Clone
                                </>
                            )}
                        </button>

                        {cloneError && (
                            <p className="text-[10px] text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">
                                {cloneError}
                            </p>
                        )}
                    </div>
                )}

                {/* Source code list (shown below both tabs when repos exist) */}
                {sourceEntries.length > 0 && (
                    <>
                        <div className="px-3 py-1.5 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                                Source Code ({sourceEntries.length})
                            </span>
                        </div>
                        <table className="w-full text-xs">
                            <tbody>
                                {sourceEntries.map((entry) => (
                                    <tr
                                        key={entry.name}
                                        className="border-b border-neutral-100 dark:border-neutral-700 last:border-b-0 hover:bg-neutral-50/50 dark:hover:bg-neutral-700/50"
                                    >
                                        <td className="px-3 py-2">
                                            <p className="font-mono text-neutral-900 dark:text-neutral-100">{entry.name}</p>
                                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                                                {entry.type === 'git'
                                                    ? `git${entry.branch ? ` • ${entry.branch}` : ''}`
                                                    : 'zip'}
                                                {entry.size_human ? ` • ${entry.size_human}` : ''}
                                            </p>
                                        </td>
                                        <td className="px-2 py-2 w-px">
                                            <button
                                                onClick={() => handleDeleteSource(entry.name)}
                                                className="p-0.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-neutral-300 dark:text-neutral-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                                title="Delete"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
            </div>

            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-2">
                Files are stored in{' '}
                <code className="px-1 bg-neutral-100 dark:bg-neutral-700 rounded font-mono">/context</code>.
                {' '}Repos and source ZIPs go to{' '}
                <code className="px-1 bg-neutral-100 dark:bg-neutral-700 rounded font-mono">/source</code>.
            </p>
        </div>
    );
};

ContextDocumentsPanel.propTypes = {
    assessmentId: PropTypes.number.isRequired,
};

export default ContextDocumentsPanel;
