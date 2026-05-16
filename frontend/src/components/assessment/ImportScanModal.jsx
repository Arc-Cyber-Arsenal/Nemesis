import { useState, useCallback } from 'react';
import {
    Upload,
    FolderOpen,
    AlertCircle,
    CheckCircle,
    Loader,
    Trash2,
    FileText,
    Server,
    Link,
    Shield,
    X,
    ChevronRight
} from 'lucide-react';
import apiClient from '../../services/api';
import Modal from '../common/Modal';
import Button from '../common/Button';

const ImportScanModal = ({ assessmentId, onClose, onSuccess }) => {
    const [step, setStep] = useState(1); // 1 = upload, 2 = review, 3 = importing/done
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [parsedData, setParsedData] = useState(null);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [activeTab, setActiveTab] = useState('services');
    const [importStats, setImportStats] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // Workspaces folder path - will be fetched from backend/container
    const [workspacesPath, setWorkspacesPath] = useState('~/.exegol/workspaces/');

    // Handle file selection
    const handleFileSelect = (e) => {
        const newFiles = Array.from(e.target.files);
        addFiles(newFiles);
    };

    const addFiles = (newFiles) => {
        // Filter valid extensions
        const validExtensions = ['.xml', '.json', '.jsonl'];
        const validFiles = newFiles.filter(file => {
            const ext = '.' + file.name.split('.').pop().toLowerCase();
            return validExtensions.includes(ext);
        });

        if (validFiles.length !== newFiles.length) {
            setError('Some files were skipped. Supported: .xml (nmap), .json (nuclei/ffuf)');
        }

        setFiles(prev => [...prev, ...validFiles]);
        setError(null);
    };

    // Drag and drop handlers
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        addFiles(droppedFiles);
    }, []);

    // Remove file from list
    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const openWorkspacesFolder = async () => {
        try {
            await apiClient.post('/system/open-folder', { path: workspacesPath });
        } catch (err) {
            // Fallback: show path to user
            setError(`Open this folder manually: ${workspacesPath}`);
        }
    };

    // Parse uploaded files (Step 1 -> Step 2)
    const handleParse = async () => {
        if (files.length === 0) {
            setError('Please select at least one scan file');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            files.forEach(file => {
                formData.append('files', file);
            });

            const response = await apiClient.post(
                `/assessments/${assessmentId}/parse-scans`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' }
                }
            );

            if (response.data.success) {
                setParsedData(response.data);

                // Pre-select all non-duplicate items
                const nonDuplicates = new Set();
                Object.values(response.data.items).forEach(items => {
                    items.forEach(item => {
                        if (!item.is_duplicate) {
                            nonDuplicates.add(item.id);
                        }
                    });
                });
                setSelectedItems(nonDuplicates);

                // Set initial active tab to first non-empty category
                const { services, endpoints, findings } = response.data.items;
                if (services.length > 0) setActiveTab('services');
                else if (endpoints.length > 0) setActiveTab('endpoints');
                else if (findings.length > 0) setActiveTab('findings');

                setStep(2);
            }
        } catch (err) {
            console.error('Parse failed:', err);
            setError(err.response?.data?.detail || 'Failed to parse scan files');
        } finally {
            setLoading(false);
        }
    };

    // Import selected items (Step 2 -> Step 3)
    const handleImport = async () => {
        setLoading(true);
        setError(null);
        setStep(3);

        try {
            const response = await apiClient.post(
                `/assessments/${assessmentId}/import-scans`,
                {
                    item_ids: Array.from(selectedItems),
                    items: parsedData.items
                }
            );

            if (response.data.success) {
                setImportStats(response.data.stats);
                setTimeout(() => {
                    onSuccess?.(response.data.stats);
                    onClose();
                }, 2500);
            }
        } catch (err) {
            console.error('Import failed:', err);
            setError(err.response?.data?.detail || 'Failed to import scan results');
            setStep(2);
        } finally {
            setLoading(false);
        }
    };

    // Toggle item selection
    const toggleItem = (itemId) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    // Remove item from parsed data
    const removeItem = (itemId) => {
        setParsedData(prev => {
            const newItems = { ...prev.items };
            Object.keys(newItems).forEach(key => {
                newItems[key] = newItems[key].filter(item => item.id !== itemId);
            });
            return { ...prev, items: newItems };
        });
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
        });
    };

    // Get scan type badge color
    const getScanTypeBadgeColor = (source) => {
        switch (source) {
            case 'nmap': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'nuclei': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'ffuf': return 'bg-green-500/20 text-green-400 border-green-500/30';
            default: return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
        }
    };

    // Get severity badge color
    const getSeverityColor = (severity) => {
        switch (severity?.toUpperCase()) {
            case 'CRITICAL': return 'bg-purple-500/20 text-purple-400';
            case 'HIGH': return 'bg-red-500/20 text-red-400';
            case 'MEDIUM': return 'bg-orange-500/20 text-orange-400';
            case 'LOW': return 'bg-yellow-500/20 text-yellow-400';
            default: return 'bg-blue-500/20 text-blue-400';
        }
    };

    // Get active tab items
    const getActiveItems = () => {
        if (!parsedData) return [];
        return parsedData.items[activeTab] || [];
    };

    // Tab configuration
    const tabs = [
        {
            id: 'services',
            label: 'Services',
            icon: Server,
            count: parsedData?.items?.services?.length || 0
        },
        {
            id: 'endpoints',
            label: 'Endpoints',
            icon: Link,
            count: parsedData?.items?.endpoints?.length || 0
        },
        {
            id: 'findings',
            label: 'Findings',
            icon: Shield,
            count: parsedData?.items?.findings?.length || 0
        },
    ];

    const getTitle = () => {
        if (step === 1) return 'Import Scan Results';
        if (step === 2) return 'Review & Import';
        if (step === 3) return importStats ? 'Import Complete' : 'Importing...';
    };

    const getFooter = () => {
        if (step === 1) {
            return (
                <>
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleParse}
                        disabled={loading || files.length === 0}
                    >
                        {loading ? (
                            <>
                                <Loader className="animate-spin w-4 h-4 mr-2" />
                                Parsing...
                            </>
                        ) : (
                            <>
                                Next
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </>
                        )}
                    </Button>
                </>
            );
        }

        if (step === 2) {
            return (
                <>
                    <Button variant="secondary" onClick={() => setStep(1)} disabled={loading}>
                        Back
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleImport}
                        disabled={selectedItems.size === 0 || loading}
                    >
                        Import {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''}
                    </Button>
                </>
            );
        }

        if (step === 3 && importStats) {
            return (
                <Button variant="primary" onClick={onClose}>
                    Close
                </Button>
            );
        }

        return null;
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={getTitle()}
            size="xl"
            footer={getFooter()}
        >
            <div className="space-y-4 max-h-[65vh] overflow-y-auto">
                {/* Step 1: Upload Files */}
                {step === 1 && (
                    <>
                        {/* Drop Zone */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                                ? 'border-primary-500 bg-primary-500/10'
                                : 'border-neutral-600 hover:border-neutral-500'
                                }`}
                        >
                            <Upload className="w-10 h-10 mx-auto mb-3 text-neutral-500" />
                            <p className="text-neutral-300 mb-2">
                                Drop scan files here or{' '}
                                <label className="text-primary-400 hover:text-primary-300 cursor-pointer underline">
                                    browse
                                    <input
                                        type="file"
                                        multiple
                                        accept=".xml,.json,.jsonl"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                </label>
                            </p>
                            <p className="text-xs text-neutral-500">
                                Supported: nmap (.xml), nuclei (.json), ffuf (.json)
                            </p>
                        </div>

                        {/* Open Workspaces Folder Button */}
                        <div className="flex items-center gap-3">
                            <Button
                                variant="secondary"
                                onClick={openWorkspacesFolder}
                                className="flex items-center gap-2"
                            >
                                <FolderOpen className="w-4 h-4" />
                                Open Workspaces Folder
                            </Button>
                            <span className="text-xs text-neutral-500 truncate flex-1">
                                {workspacesPath}
                            </span>
                        </div>

                        {/* File List */}
                        {files.length > 0 && (
                            <div className="border border-neutral-700 rounded-lg divide-y divide-neutral-700">
                                {files.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between px-4 py-2.5 hover:bg-neutral-800/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-4 h-4 text-neutral-500" />
                                            <span className="text-sm text-neutral-200 font-mono">
                                                {file.name}
                                            </span>
                                            <span className="text-xs text-neutral-500">
                                                {(file.size / 1024).toFixed(1)} KB
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="p-1 hover:bg-red-500/20 rounded text-neutral-500 hover:text-red-400 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Info Box */}
                        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p className="text-blue-300 text-sm">
                                <strong>Tip:</strong> Run your scans with output flags:
                            </p>
                            <ul className="text-blue-400 text-xs mt-1 space-y-0.5 font-mono">
                                <li>nmap -sV -oX scan.xml target</li>
                                <li>nuclei -u target -json -o results.json</li>
                                <li>ffuf -u target/FUZZ -of json -o dirs.json</li>
                            </ul>
                        </div>
                    </>
                )}

                {/* Step 2: Review & Select */}
                {step === 2 && parsedData && (
                    <>
                        {/* Summary Stats */}
                        <div className="grid grid-cols-5 gap-2">
                            <div className="bg-neutral-800 rounded-lg px-3 py-2 border border-neutral-700">
                                <div className="text-xl font-bold text-primary-400">
                                    {parsedData.stats.total}
                                </div>
                                <div className="text-[10px] text-neutral-500 uppercase">Total</div>
                            </div>
                            <div className="bg-neutral-800 rounded-lg px-3 py-2 border border-neutral-700">
                                <div className="text-xl font-bold text-blue-400">
                                    {parsedData.stats.services}
                                </div>
                                <div className="text-[10px] text-neutral-500 uppercase">Services</div>
                            </div>
                            <div className="bg-neutral-800 rounded-lg px-3 py-2 border border-neutral-700">
                                <div className="text-xl font-bold text-green-400">
                                    {parsedData.stats.endpoints}
                                </div>
                                <div className="text-[10px] text-neutral-500 uppercase">Endpoints</div>
                            </div>
                            <div className="bg-neutral-800 rounded-lg px-3 py-2 border border-neutral-700">
                                <div className="text-xl font-bold text-purple-400">
                                    {parsedData.stats.findings}
                                </div>
                                <div className="text-[10px] text-neutral-500 uppercase">Findings</div>
                            </div>
                            <div className="bg-neutral-800 rounded-lg px-3 py-2 border border-neutral-700">
                                <div className="text-xl font-bold text-orange-400">
                                    {parsedData.stats.duplicates}
                                </div>
                                <div className="text-[10px] text-neutral-500 uppercase">Duplicates</div>
                            </div>
                        </div>

                        {/* Selection Info */}
                        <div className="flex items-center justify-between px-1">
                            <span className="text-sm text-neutral-400">
                                <span className="text-primary-400 font-medium">{selectedItems.size}</span> items selected for import
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        const all = new Set();
                                        Object.values(parsedData.items).forEach(items => {
                                            items.forEach(item => {
                                                if (!item.is_duplicate) all.add(item.id);
                                            });
                                        });
                                        setSelectedItems(all);
                                    }}
                                    className="text-xs text-primary-400 hover:text-primary-300"
                                >
                                    Select All
                                </button>
                                <span className="text-neutral-600">|</span>
                                <button
                                    onClick={() => setSelectedItems(new Set())}
                                    className="text-xs text-neutral-400 hover:text-neutral-300"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 border-b border-neutral-700">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id
                                        ? 'border-primary-500 text-primary-400'
                                        : 'border-transparent text-neutral-500 hover:text-neutral-300'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                    <span className={`px-1.5 py-0.5 text-xs rounded ${activeTab === tab.id ? 'bg-primary-500/20' : 'bg-neutral-700'
                                        }`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Items Table */}
                        <div className="border border-neutral-700 rounded-lg overflow-hidden">
                            <div className="max-h-[300px] overflow-y-auto">
                                {getActiveItems().length === 0 ? (
                                    <div className="p-8 text-center text-neutral-500">
                                        No {activeTab} found in uploaded scans
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-neutral-800 sticky top-0">
                                            <tr className="text-xs text-neutral-500 uppercase">
                                                <th className="w-10 p-2"></th>
                                                <th className="text-left p-2">Name</th>
                                                <th className="text-center p-2 w-20">Source</th>
                                                {activeTab === 'services' && (
                                                    <th className="text-center p-2 w-20">Port</th>
                                                )}
                                                {activeTab === 'endpoints' && (
                                                    <th className="text-center p-2 w-20">Status</th>
                                                )}
                                                {activeTab === 'findings' && (
                                                    <th className="text-center p-2 w-24">Severity</th>
                                                )}
                                                <th className="w-10 p-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-800">
                                            {getActiveItems().map(item => {
                                                const isSelected = selectedItems.has(item.id);
                                                const isDuplicate = item.is_duplicate;

                                                return (
                                                    <tr
                                                        key={item.id}
                                                        onClick={() => !isDuplicate && toggleItem(item.id)}
                                                        className={`transition-colors ${isDuplicate
                                                            ? 'bg-orange-500/5 cursor-not-allowed'
                                                            : isSelected
                                                                ? 'bg-primary-500/10 hover:bg-primary-500/15 cursor-pointer'
                                                                : 'hover:bg-neutral-800/50 cursor-pointer'
                                                            }`}
                                                    >
                                                        <td className="p-2 text-center">
                                                            {isDuplicate ? (
                                                                <span className="text-orange-400 text-xs">⚠️</span>
                                                            ) : (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => toggleItem(item.id)}
                                                                    onClick={e => e.stopPropagation()}
                                                                    className="rounded border-neutral-600 text-primary-500 focus:ring-primary-500 bg-neutral-800"
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="p-2">
                                                            <div className="font-mono text-neutral-200 truncate max-w-[300px]">
                                                                {item.name}
                                                            </div>
                                                            {isDuplicate && (
                                                                <div className="text-[10px] text-orange-400">
                                                                    Duplicate - already exists
                                                                </div>
                                                            )}
                                                            {item.details?.host && (
                                                                <div className="text-[10px] text-neutral-500">
                                                                    {item.details.host}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <span className={`px-2 py-0.5 text-[10px] rounded border ${getScanTypeBadgeColor(item.source)}`}>
                                                                {item.source}
                                                            </span>
                                                        </td>
                                                        {activeTab === 'services' && (
                                                            <td className="p-2 text-center text-neutral-400">
                                                                {item.details?.port}
                                                            </td>
                                                        )}
                                                        {activeTab === 'endpoints' && (
                                                            <td className="p-2 text-center">
                                                                <span className={`px-1.5 py-0.5 text-[10px] rounded ${item.details?.status_code >= 200 && item.details?.status_code < 300
                                                                    ? 'bg-green-500/20 text-green-400'
                                                                    : item.details?.status_code >= 300 && item.details?.status_code < 400
                                                                        ? 'bg-blue-500/20 text-blue-400'
                                                                        : 'bg-neutral-500/20 text-neutral-400'
                                                                    }`}>
                                                                    {item.details?.status_code}
                                                                </span>
                                                            </td>
                                                        )}
                                                        {activeTab === 'findings' && (
                                                            <td className="p-2 text-center">
                                                                <span className={`px-2 py-0.5 text-[10px] rounded ${getSeverityColor(item.severity)}`}>
                                                                    {item.severity}
                                                                </span>
                                                            </td>
                                                        )}
                                                        <td className="p-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeItem(item.id);
                                                                }}
                                                                className="p-1 hover:bg-red-500/20 rounded text-neutral-600 hover:text-red-400 transition-colors"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        {/* File Sources */}
                        <div className="flex flex-wrap gap-2">
                            {parsedData.files.map((file, idx) => (
                                <div
                                    key={idx}
                                    className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${file.success
                                        ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                                        : 'bg-red-500/10 border border-red-500/30 text-red-400'
                                        }`}
                                >
                                    {file.success ? (
                                        <CheckCircle className="w-3 h-3" />
                                    ) : (
                                        <AlertCircle className="w-3 h-3" />
                                    )}
                                    <span className="font-mono">{file.filename}</span>
                                    <span className={`px-1.5 py-0.5 rounded ${getScanTypeBadgeColor(file.scan_type)}`}>
                                        {file.scan_type}
                                    </span>
                                    <span className="text-neutral-500">{file.item_count} items</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Step 3: Importing/Done */}
                {step === 3 && (
                    <div className="py-8">
                        {!importStats ? (
                            <div className="flex flex-col items-center gap-4">
                                <Loader className="w-12 h-12 text-primary-400 animate-spin" />
                                <p className="text-neutral-300">Importing scan results...</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                                        <CheckCircle className="w-8 h-8 text-green-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-neutral-200">
                                        Import Complete!
                                    </h3>
                                </div>

                                <div className="grid grid-cols-4 gap-3">
                                    <div className="bg-neutral-800 rounded-lg p-4 text-center border border-neutral-700">
                                        <div className="text-2xl font-bold text-blue-400">
                                            {importStats.services}
                                        </div>
                                        <div className="text-xs text-neutral-500">Services</div>
                                    </div>
                                    <div className="bg-neutral-800 rounded-lg p-4 text-center border border-neutral-700">
                                        <div className="text-2xl font-bold text-green-400">
                                            {importStats.endpoints}
                                        </div>
                                        <div className="text-xs text-neutral-500">Endpoints</div>
                                    </div>
                                    <div className="bg-neutral-800 rounded-lg p-4 text-center border border-neutral-700">
                                        <div className="text-2xl font-bold text-purple-400">
                                            {importStats.findings}
                                        </div>
                                        <div className="text-xs text-neutral-500">Findings</div>
                                    </div>
                                    <div className="bg-neutral-800 rounded-lg p-4 text-center border border-neutral-700">
                                        <div className="text-2xl font-bold text-orange-400">
                                            {importStats.skipped_duplicates}
                                        </div>
                                        <div className="text-xs text-neutral-500">Skipped</div>
                                    </div>
                                </div>

                                <p className="text-center text-neutral-400 text-sm">
                                    Data is now visible in the Recon tab and available for AIDA.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-red-300 font-medium text-sm">Error</p>
                            <p className="text-red-400 text-xs mt-0.5">{error}</p>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ImportScanModal;
