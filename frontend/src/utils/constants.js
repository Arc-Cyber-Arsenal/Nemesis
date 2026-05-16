/**
 * Application constants
 */

export const CARD_TYPES = {
  FINDING: 'finding',
  OBSERVATION: 'observation',
  INFO: 'info',
};

export const SEVERITIES = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO',
};

export const FINDING_STATUS = {
  CONFIRMED: 'confirmed',
  POTENTIAL: 'potential',
  UNTESTED: 'untested',
};

export const ASSESSMENT_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
};

export const RECON_DATA_TYPES = {
  ENDPOINT: 'endpoint',
  TECHNOLOGY: 'technology',
  SERVICE: 'service',
  SUBDOMAIN: 'subdomain',
};

export const PHASE_LABELS = {
  1: 'Phase 1 - Reconnaissance',
  2: 'Phase 2 - Mapping & Enumeration',
  3: 'Phase 3 - Vulnerability Assessment',
  4: 'Phase 4 - Exploitation & Validation',
  5: 'Phase 5 - Post-Exploitation',
};
