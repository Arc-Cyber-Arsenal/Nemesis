/**
 * Severity badge component - centralized severity display
 * Used for findings and vulnerability severity levels
 * Supports optional CVSS 4.0 score display.
 */
import PropTypes from 'prop-types';

const SeverityBadge = ({ severity, cvssScore, className = '' }) => {
  const getSeverityStyles = (sev) => {
    switch (sev?.toUpperCase()) {
      case 'CRITICAL':
        return 'badge-critical';
      case 'HIGH':
        return 'badge-high';
      case 'MEDIUM':
        return 'badge-medium';
      case 'LOW':
        return 'badge-low';
      case 'INFO':
        return 'badge-info';
      default:
        return 'badge-neutral';
    }
  };

  if (!severity) return null;

  return (
    <span className={`badge ${getSeverityStyles(severity)} ${className}`}>
      {severity.toUpperCase()}
      {cvssScore != null && (
        <span className="ml-1 font-mono opacity-80 text-[0.7em]">
          {Number(cvssScore).toFixed(1)}
        </span>
      )}
    </span>
  );
};

SeverityBadge.propTypes = {
  severity: PropTypes.oneOf(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO', 'critical', 'high', 'medium', 'low', 'info']),
  cvssScore: PropTypes.number,
  className: PropTypes.string,
};

export default SeverityBadge;
