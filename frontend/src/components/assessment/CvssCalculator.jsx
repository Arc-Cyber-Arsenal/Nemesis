import { useState, useEffect } from 'react';
import { CVSS4_METRICS, CVSS4_DEFAULTS, buildVector, metricsToScore, parseVector } from '../../utils/cvss4';

const SEVERITY_STYLES = {
  CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/30',
  HIGH:     'bg-orange-500/10 text-orange-400 border-orange-500/30',
  MEDIUM:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  LOW:      'bg-blue-500/10 text-blue-400 border-blue-500/30',
  INFO:     'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
};

const GROUPS = [
  { label: 'Exploitability', keys: ['AV', 'AC', 'AT', 'PR', 'UI'] },
  { label: 'Vulnerable System', keys: ['VC', 'VI', 'VA'] },
  { label: 'Subsequent System', keys: ['SC', 'SI', 'SA'] },
];

const CvssCalculator = ({ initialVector, onChange }) => {
  const [metrics, setMetrics] = useState(() => {
    if (initialVector) {
      const { metrics: parsed, isValid } = parseVector(initialVector);
      if (isValid && parsed) return { ...CVSS4_DEFAULTS, ...parsed };
    }
    return { ...CVSS4_DEFAULTS };
  });
  const [vectorInput, setVectorInput] = useState(initialVector || '');
  const [vectorError, setVectorError] = useState(null);

  useEffect(() => {
    const { score, severity, vector } = metricsToScore(metrics);
    setVectorInput(vector);
    setVectorError(null);
    if (onChange) onChange(vector, score, severity);
  }, [metrics]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMetric = (key, value) => setMetrics(prev => ({ ...prev, [key]: value }));

  const handleVectorInput = (e) => {
    const raw = e.target.value;
    setVectorInput(raw);
    const { metrics: parsed, isValid, error } = parseVector(raw);
    if (isValid && parsed) {
      setMetrics({ ...CVSS4_DEFAULTS, ...parsed });
      setVectorError(null);
    } else {
      setVectorError(error);
    }
  };

  const { score, severity } = metricsToScore(metrics);
  const severityStyle = severity ? SEVERITY_STYLES[severity] : 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';

  return (
    <div className="space-y-3">

      {/* Score banner */}
      <div className={`flex items-center gap-3 px-3 py-2 rounded-md border text-sm ${severityStyle}`}>
        <span className="text-xl font-bold font-mono tabular-nums">
          {score !== null ? score.toFixed(1) : '—'}
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] font-medium uppercase tracking-wider opacity-60">CVSS 4.0</span>
          <span className="font-semibold">{severity || 'N/A'}</span>
        </div>
      </div>

      {/* Metric groups */}
      {GROUPS.map(group => (
        <div key={group.label}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1.5">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.keys.map(key => {
              const def = CVSS4_METRICS[key];
              if (!def) return null;
              return (
                <div key={key} className="flex items-center gap-2">
                  {/* Label */}
                  <div className="w-32 flex-shrink-0 flex items-center gap-1">
                    <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{def.label}</span>
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-600 font-mono">({key})</span>
                  </div>
                  {/* Buttons */}
                  <div className="flex gap-1 flex-wrap">
                    {def.options.map(opt => {
                      const selected = metrics[key] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          title={opt.description}
                          onClick={() => handleMetric(key, opt.value)}
                          className={`px-2 py-0.5 text-[11px] rounded border transition-colors font-medium ${
                            selected
                              ? 'bg-primary-600 dark:bg-primary-700 text-white border-transparent'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-700 hover:border-primary-400 dark:hover:border-primary-600'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Vector string */}
      <div>
        <input
          type="text"
          value={vectorInput}
          onChange={handleVectorInput}
          placeholder="CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N"
          className={`w-full px-2.5 py-1.5 border rounded text-[11px] font-mono focus:ring-1 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 ${
            vectorError
              ? 'border-red-400 dark:border-red-600'
              : 'border-neutral-300 dark:border-neutral-700'
          }`}
        />
        {vectorError && (
          <p className="text-[11px] text-red-500 dark:text-red-400 mt-0.5">{vectorError}</p>
        )}
      </div>
    </div>
  );
};

export default CvssCalculator;
