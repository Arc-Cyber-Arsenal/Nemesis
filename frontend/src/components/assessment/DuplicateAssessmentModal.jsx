import { useState, useEffect } from 'react';
import { Copy, FileText, AlertTriangle, Terminal, Database, Check } from '../icons';
import apiClient from '../../services/api';
import folderService from '../../services/folderService';
import UnifiedModal from '../common/UnifiedModal';

const OptionCard = ({ checked, disabled, onChange, icon: Icon, label, lines }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    className={`relative text-left p-3 rounded-lg border transition-all ${
      disabled
        ? 'opacity-40 cursor-not-allowed border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50'
        : checked
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 cursor-pointer'
          : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 hover:border-neutral-300 dark:hover:border-neutral-600 cursor-pointer'
    }`}
  >
    {/* Checkbox indicator */}
    <div className={`absolute top-2.5 right-2.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
      checked && !disabled
        ? 'bg-primary-600 border-primary-600'
        : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800'
    }`}>
      {checked && !disabled && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
    </div>

    <div className="flex items-start gap-2.5 pr-6">
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
        checked && !disabled ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-400 dark:text-neutral-500'
      }`} />
      <div>
        <p className={`text-sm font-medium leading-tight ${
          checked && !disabled
            ? 'text-primary-700 dark:text-primary-300'
            : 'text-neutral-700 dark:text-neutral-300'
        }`}>
          {label}
        </p>
        <div className="mt-1 space-y-0.5">
          {lines.map((line, i) => (
            <p key={i} className="text-xs text-neutral-500 dark:text-neutral-400 leading-tight">{line}</p>
          ))}
        </div>
      </div>
    </div>
  </button>
);

const DuplicateAssessmentModal = ({ assessment, isOpen, onClose, onSuccess }) => {
  const [duplicateName, setDuplicateName] = useState('');
  const [options, setOptions] = useState({
    include_cards: false,
    include_sections: false,
    include_recon: false,
    include_commands: false,
  });
  const [counts, setCounts] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !assessment) return;
    setDuplicateName(`${assessment.name} (Copy)`);
    setCounts(null);
    setError(null);
    setOptions({ include_cards: false, include_sections: false, include_recon: false, include_commands: false });
    fetchCounts();
  }, [isOpen, assessment?.id]);

  const fetchCounts = async () => {
    try {
      const [fullRes, cmdRes] = await Promise.all([
        apiClient.get(`/assessments/${assessment.id}/full`),
        apiClient.get(`/assessments/${assessment.id}/commands`),
      ]);

      const { cards = [], sections = [], recon_data = [] } = fullRes.data;
      const commands = cmdRes.data || [];

      const sectionsWithContent = sections.filter(s => s.content && s.content.trim().length > 0);

      setCounts({
        findings: cards.filter(c => c.card_type === 'finding').length,
        observations: cards.filter(c => c.card_type === 'observation').length,
        infos: cards.filter(c => c.card_type === 'info').length,
        totalCards: cards.length,
        sections: sectionsWithContent.length,
        recon: recon_data.length,
        commands: commands.length,
      });
    } catch {
      setCounts({ findings: 0, observations: 0, infos: 0, totalCards: 0, sections: 0, recon: 0, commands: 0 });
    }
  };

  const handleSubmit = async () => {
    if (!duplicateName.trim()) {
      setError('Assessment name cannot be empty');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await folderService.duplicateAssessment(assessment.id, { name: duplicateName.trim(), ...options });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to duplicate assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggle = (key) => setOptions(prev => ({ ...prev, [key]: !prev[key] }));

  const loading = counts === null;

  const cardLines = loading
    ? ['Loading...']
    : counts.totalCards === 0
      ? ['Nothing to copy']
      : [
          counts.findings > 0 ? `${counts.findings} finding${counts.findings > 1 ? 's' : ''}` : null,
          counts.observations > 0 ? `${counts.observations} observation${counts.observations > 1 ? 's' : ''}` : null,
          counts.infos > 0 ? `${counts.infos} info${counts.infos > 1 ? 's' : ''}` : null,
        ].filter(Boolean);

  const sectionLines = loading
    ? ['Loading...']
    : counts.sections === 0
      ? ['No notes written yet']
      : [`${counts.sections} phase${counts.sections > 1 ? 's' : ''} with notes`];

  const reconLines = loading
    ? ['Loading...']
    : counts.recon === 0
      ? ['Nothing to copy']
      : [`${counts.recon} item${counts.recon > 1 ? 's' : ''}`];

  const cmdLines = loading
    ? ['Loading...']
    : counts.commands === 0
      ? ['No commands yet']
      : [`${counts.commands} command${counts.commands > 1 ? 's' : ''}`];

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Duplicate Assessment"
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Duplicate"
      size="sm"
    >
      <div className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            New name
          </label>
          <input
            type="text"
            value={duplicateName}
            onChange={(e) => setDuplicateName(e.target.value)}
            className="input"
            placeholder="Assessment name"
            disabled={isSubmitting}
          />
        </div>

        {/* Always included */}
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
            Always included
          </p>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
            <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            <span className="text-xs text-neutral-600 dark:text-neutral-400">
              Metadata — name, client, scope, dates, domains, objectives
            </span>
          </div>
        </div>

        {/* Optional */}
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
            Choose what to copy
          </p>
          <div className="grid grid-cols-2 gap-2">
            <OptionCard
              checked={options.include_cards}
              disabled={loading || counts?.totalCards === 0}
              onChange={() => toggle('include_cards')}
              icon={AlertTriangle}
              label="Cards"
              lines={cardLines}
            />
            <OptionCard
              checked={options.include_sections}
              disabled={loading || counts?.sections === 0}
              onChange={() => toggle('include_sections')}
              icon={FileText}
              label="Phase Notes"
              lines={sectionLines}
            />
            <OptionCard
              checked={options.include_recon}
              disabled={loading || counts?.recon === 0}
              onChange={() => toggle('include_recon')}
              icon={Database}
              label="Recon Data"
              lines={reconLines}
            />
            <OptionCard
              checked={options.include_commands}
              disabled={loading || counts?.commands === 0}
              onChange={() => toggle('include_commands')}
              icon={Terminal}
              label="Commands"
              lines={cmdLines}
            />
          </div>
        </div>

        {error && (
          <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    </UnifiedModal>
  );
};

export default DuplicateAssessmentModal;
