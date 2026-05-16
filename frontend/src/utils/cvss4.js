/**
 * CVSS 4.0 Calculator
 * Adapted from the official FIRST / Red Hat reference implementation (BSD-2-Clause)
 * https://github.com/RedHatProductSecurity/cvss-v4-calculator
 *
 * Copyright FIRST, Red Hat, and contributors
 * SPDX-License-Identifier: BSD-2-Clause
 */

// ─── Metric definitions (for the UI) ──────────────────────────────────────────

export const CVSS4_METRICS = {
  AV: {
    label: 'Attack Vector',
    group: 'Exploitability',
    options: [
      { value: 'N', label: 'Network',  description: 'Exploitable remotely over the network' },
      { value: 'A', label: 'Adjacent', description: 'Requires access to a shared network (Wi-Fi, Bluetooth…)' },
      { value: 'L', label: 'Local',    description: 'Requires local access or user login' },
      { value: 'P', label: 'Physical', description: 'Requires physical access to the device' },
    ],
  },
  AC: {
    label: 'Attack Complexity',
    group: 'Exploitability',
    options: [
      { value: 'L', label: 'Low',  description: 'No special conditions required' },
      { value: 'H', label: 'High', description: 'Requires specific conditions or significant effort' },
    ],
  },
  AT: {
    label: 'Attack Requirements',
    group: 'Exploitability',
    options: [
      { value: 'N', label: 'None',    description: 'No deployment or execution prerequisites' },
      { value: 'P', label: 'Present', description: 'Specific configuration or scenario required' },
    ],
  },
  PR: {
    label: 'Privileges Required',
    group: 'Exploitability',
    options: [
      { value: 'N', label: 'None', description: 'No privileges required before attack' },
      { value: 'L', label: 'Low',  description: 'Basic user-level privileges required' },
      { value: 'H', label: 'High', description: 'Significant / admin privileges required' },
    ],
  },
  UI: {
    label: 'User Interaction',
    group: 'Exploitability',
    options: [
      { value: 'N', label: 'None',    description: 'No user interaction required' },
      { value: 'P', label: 'Passive', description: 'User interaction required but no specific action needed' },
      { value: 'A', label: 'Active',  description: 'User must actively perform a specific action' },
    ],
  },
  VC: {
    label: 'Confidentiality',
    group: 'Vulnerable System Impact',
    options: [
      { value: 'H', label: 'High', description: 'Total loss of confidentiality' },
      { value: 'L', label: 'Low',  description: 'Some loss of confidentiality' },
      { value: 'N', label: 'None', description: 'No impact to confidentiality' },
    ],
  },
  VI: {
    label: 'Integrity',
    group: 'Vulnerable System Impact',
    options: [
      { value: 'H', label: 'High', description: 'Total loss of integrity' },
      { value: 'L', label: 'Low',  description: 'Modification of some data possible' },
      { value: 'N', label: 'None', description: 'No impact to integrity' },
    ],
  },
  VA: {
    label: 'Availability',
    group: 'Vulnerable System Impact',
    options: [
      { value: 'H', label: 'High', description: 'Total loss of availability' },
      { value: 'L', label: 'Low',  description: 'Reduced performance or interrupted availability' },
      { value: 'N', label: 'None', description: 'No impact to availability' },
    ],
  },
  SC: {
    label: 'Confidentiality',
    group: 'Subsequent System Impact',
    options: [
      { value: 'H', label: 'High', description: 'Significant confidentiality impact on other systems' },
      { value: 'L', label: 'Low',  description: 'Some confidentiality impact on other systems' },
      { value: 'N', label: 'None', description: 'No impact on subsequent systems' },
    ],
  },
  SI: {
    label: 'Integrity',
    group: 'Subsequent System Impact',
    options: [
      { value: 'H', label: 'High', description: 'Significant integrity impact on other systems' },
      { value: 'L', label: 'Low',  description: 'Some integrity impact on other systems' },
      { value: 'N', label: 'None', description: 'No integrity impact on subsequent systems' },
    ],
  },
  SA: {
    label: 'Availability',
    group: 'Subsequent System Impact',
    options: [
      { value: 'H', label: 'High', description: 'Significant availability impact on other systems' },
      { value: 'L', label: 'Low',  description: 'Some availability impact on other systems' },
      { value: 'N', label: 'None', description: 'No availability impact on subsequent systems' },
    ],
  },
};

// Default values — first option of each base metric (spec defaults)
export const CVSS4_DEFAULTS = {
  AV: 'N', AC: 'L', AT: 'N', PR: 'N', UI: 'N',
  VC: 'N', VI: 'N', VA: 'N',
  SC: 'N', SI: 'N', SA: 'N',
};

// Metric key order for vector string
const BASE_METRIC_ORDER = ['AV', 'AC', 'AT', 'PR', 'UI', 'VC', 'VI', 'VA', 'SC', 'SI', 'SA'];

// ─── Official CVSS 4.0 lookup table (246 MacroVectors) ────────────────────────
// Source: https://github.com/RedHatProductSecurity/cvss-v4-calculator/blob/main/cvss40.js
const LOOKUP_TABLE = {
  "000000": 10,   "000001": 9.9,  "000010": 9.8,  "000011": 9.5,  "000020": 9.5,
  "000021": 9.2,  "000100": 10,   "000101": 9.6,  "000110": 9.3,  "000111": 8.7,
  "000120": 9.1,  "000121": 8.1,  "000200": 9.3,  "000201": 9,    "000210": 8.9,
  "000211": 8,    "000220": 8.1,  "000221": 6.8,  "001000": 9.8,  "001001": 9.5,
  "001010": 9.5,  "001011": 9.2,  "001020": 9,    "001021": 8.4,  "001100": 9.3,
  "001101": 9.2,  "001110": 8.9,  "001111": 8.1,  "001120": 8.1,  "001121": 6.5,
  "001200": 8.8,  "001201": 8,    "001210": 7.8,  "001211": 7,    "001220": 6.9,
  "001221": 4.8,  "002001": 9.2,  "002011": 8.2,  "002021": 7.2,  "002101": 7.9,
  "002111": 6.9,  "002121": 5,    "002201": 6.9,  "002211": 5.5,  "002221": 2.7,
  "010000": 9.9,  "010001": 9.7,  "010010": 9.5,  "010011": 9.2,  "010020": 9.2,
  "010021": 8.5,  "010100": 9.5,  "010101": 9.1,  "010110": 9,    "010111": 8.3,
  "010120": 8.4,  "010121": 7.1,  "010200": 9.2,  "010201": 8.1,  "010210": 8.2,
  "010211": 7.1,  "010220": 7.2,  "010221": 5.3,  "011000": 9.5,  "011001": 9.3,
  "011010": 9.2,  "011011": 8.5,  "011020": 8.5,  "011021": 7.3,  "011100": 9.2,
  "011101": 8.2,  "011110": 8,    "011111": 7.2,  "011120": 7,    "011121": 5.9,
  "011200": 8.4,  "011201": 7,    "011210": 7.1,  "011211": 5.2,  "011220": 5,
  "011221": 3,    "012001": 8.6,  "012011": 7.5,  "012021": 5.2,  "012101": 7.1,
  "012111": 5.2,  "012121": 2.9,  "012201": 6.3,  "012211": 2.9,  "012221": 1.7,
  "100000": 9.8,  "100001": 9.5,  "100010": 9.4,  "100011": 8.7,  "100020": 9.1,
  "100021": 8.1,  "100100": 9.4,  "100101": 8.9,  "100110": 8.6,  "100111": 7.4,
  "100120": 7.7,  "100121": 6.4,  "100200": 8.7,  "100201": 7.5,  "100210": 7.4,
  "100211": 6.3,  "100220": 6.3,  "100221": 4.9,  "101000": 9.4,  "101001": 8.9,
  "101010": 8.8,  "101011": 7.7,  "101020": 7.6,  "101021": 6.7,  "101100": 8.6,
  "101101": 7.6,  "101110": 7.4,  "101111": 5.8,  "101120": 5.9,  "101121": 5,
  "101200": 7.2,  "101201": 5.7,  "101210": 5.7,  "101211": 5.2,  "101220": 5.2,
  "101221": 2.5,  "102001": 8.3,  "102011": 7,    "102021": 5.4,  "102101": 6.5,
  "102111": 5.8,  "102121": 2.6,  "102201": 5.3,  "102211": 2.1,  "102221": 1.3,
  "110000": 9.5,  "110001": 9,    "110010": 8.8,  "110011": 7.6,  "110020": 7.6,
  "110021": 7,    "110100": 9,    "110101": 7.7,  "110110": 7.5,  "110111": 6.2,
  "110120": 6.1,  "110121": 5.3,  "110200": 7.7,  "110201": 6.6,  "110210": 6.8,
  "110211": 5.9,  "110220": 5.2,  "110221": 3,    "111000": 8.9,  "111001": 7.8,
  "111010": 7.6,  "111011": 6.7,  "111020": 6.2,  "111021": 5.8,  "111100": 7.4,
  "111101": 5.9,  "111110": 5.7,  "111111": 5.7,  "111120": 4.7,  "111121": 2.3,
  "111200": 6.1,  "111201": 5.2,  "111210": 5.7,  "111211": 2.9,  "111220": 2.4,
  "111221": 1.6,  "112001": 7.1,  "112011": 5.9,  "112021": 3,    "112101": 5.8,
  "112111": 2.6,  "112121": 1.5,  "112201": 2.3,  "112211": 1.3,  "112221": 0.6,
  "200000": 9.3,  "200001": 8.7,  "200010": 8.6,  "200011": 7.2,  "200020": 7.5,
  "200021": 5.8,  "200100": 8.6,  "200101": 7.4,  "200110": 7.4,  "200111": 6.1,
  "200120": 5.6,  "200121": 3.4,  "200200": 7,    "200201": 5.4,  "200210": 5.2,
  "200211": 4,    "200220": 4,    "200221": 2.2,  "201000": 8.5,  "201001": 7.5,
  "201010": 7.4,  "201011": 5.5,  "201020": 6.2,  "201021": 5.1,  "201100": 7.2,
  "201101": 5.7,  "201110": 5.5,  "201111": 4.1,  "201120": 4.6,  "201121": 1.9,
  "201200": 5.3,  "201201": 3.6,  "201210": 3.4,  "201211": 1.9,  "201220": 1.9,
  "201221": 0.8,  "202001": 6.4,  "202011": 5.1,  "202021": 2,    "202101": 4.7,
  "202111": 2.1,  "202121": 1.1,  "202201": 2.4,  "202211": 0.9,  "202221": 0.4,
  "210000": 8.8,  "210001": 7.5,  "210010": 7.3,  "210011": 5.3,  "210020": 6,
  "210021": 5,    "210100": 7.3,  "210101": 5.5,  "210110": 5.9,  "210111": 4,
  "210120": 4.1,  "210121": 2,    "210200": 5.4,  "210201": 4.3,  "210210": 4.5,
  "210211": 2.2,  "210220": 2,    "210221": 1.1,  "211000": 7.5,  "211001": 5.5,
  "211010": 5.8,  "211011": 4.5,  "211020": 4,    "211021": 2.1,  "211100": 6.1,
  "211101": 5.1,  "211110": 4.8,  "211111": 1.8,  "211120": 2,    "211121": 0.9,
  "211200": 4.6,  "211201": 1.8,  "211210": 1.7,  "211211": 0.7,  "211220": 0.8,
  "211221": 0.2,  "212001": 5.3,  "212011": 2.4,  "212021": 1.4,  "212101": 2.4,
  "212111": 1.2,  "212121": 0.5,  "212201": 1,    "212211": 0.3,  "212221": 0.1,
};

// Metric level values (severity ordering — lower = more severe)
const METRIC_LEVELS = {
  AV: { N: 0.0, A: 0.1, L: 0.2, P: 0.3 },
  PR: { N: 0.0, L: 0.1, H: 0.2 },
  UI: { N: 0.0, P: 0.1, A: 0.2 },
  AC: { L: 0.0, H: 0.1 },
  AT: { N: 0.0, P: 0.1 },
  VC: { H: 0.0, L: 0.1, N: 0.2 },
  VI: { H: 0.0, L: 0.1, N: 0.2 },
  VA: { H: 0.0, L: 0.1, N: 0.2 },
  SC: { H: 0.1, L: 0.2, N: 0.3 },
  SI: { S: 0.0, H: 0.1, L: 0.2, N: 0.3 },
  SA: { S: 0.0, H: 0.1, L: 0.2, N: 0.3 },
  CR: { H: 0.0, M: 0.1, L: 0.2 },
  IR: { H: 0.0, M: 0.1, L: 0.2 },
  AR: { H: 0.0, M: 0.1, L: 0.2 },
  E:  { U: 0.2, P: 0.1, A: 0.0 },
};

// Highest-severity vectors per EQ level (for mean distance interpolation)
const MAX_COMPOSED = {
  eq1: {
    0: ["AV:N/PR:N/UI:N/"],
    1: ["AV:A/PR:N/UI:N/", "AV:N/PR:L/UI:N/", "AV:N/PR:N/UI:P/"],
    2: ["AV:P/PR:N/UI:N/", "AV:A/PR:L/UI:P/"],
  },
  eq2: {
    0: ["AC:L/AT:N/"],
    1: ["AC:H/AT:N/", "AC:L/AT:P/"],
  },
  eq3: {
    0: { 0: ["VC:H/VI:H/VA:H/CR:H/IR:H/AR:H/"], 1: ["VC:H/VI:H/VA:L/CR:M/IR:M/AR:H/", "VC:H/VI:H/VA:H/CR:M/IR:M/AR:M/"] },
    1: { 0: ["VC:L/VI:H/VA:H/CR:H/IR:H/AR:H/", "VC:H/VI:L/VA:H/CR:H/IR:H/AR:H/"], 1: ["VC:L/VI:H/VA:L/CR:H/IR:M/AR:H/", "VC:L/VI:H/VA:H/CR:H/IR:M/AR:M/", "VC:H/VI:L/VA:H/CR:M/IR:H/AR:M/", "VC:H/VI:L/VA:L/CR:M/IR:H/AR:H/", "VC:L/VI:L/VA:H/CR:H/IR:H/AR:M/"] },
    2: { 1: ["VC:L/VI:L/VA:L/CR:H/IR:H/AR:H/"] },
  },
  eq4: {
    0: ["SC:H/SI:S/SA:S/"],
    1: ["SC:H/SI:H/SA:H/"],
    2: ["SC:L/SI:L/SA:L/"],
  },
  eq5: {
    0: ["E:A/"],
    1: ["E:P/"],
    2: ["E:U/"],
  },
};

// Max severity depths per EQ level (+1 because distance is exclusive)
const MAX_SEVERITY = {
  eq1:    { 0: 1, 1: 4, 2: 5 },
  eq2:    { 0: 1, 1: 2 },
  eq3eq6: { 0: { 0: 7, 1: 6 }, 1: { 0: 8, 1: 8 }, 2: { 1: 10 } },
  eq4:    { 0: 6, 1: 5, 2: 4 },
  eq5:    { 0: 1, 1: 1, 2: 1 },
};

// ─── Internal helpers ──────────────────────────────────────────────────────────

function roundHalfUp(value) {
  const EPSILON = Math.pow(10, -6);
  return Math.round((value + EPSILON) * 10) / 10;
}

/** Get the effective value for a metric, handling E/CR/IR/AR defaults when absent or 'X'. */
function effectiveValue(metrics, metric) {
  // Worst-case defaults when metric is absent (undefined) or explicitly 'X'
  const worstCase = { E: 'A', CR: 'H', IR: 'H', AR: 'H' };

  // Environmental overrides: MAV overrides AV, MAC overrides AC, MSI overrides SI, etc.
  const modified = 'M' + metric;
  if (metrics[modified] !== undefined && metrics[modified] !== 'X') {
    return metrics[modified];
  }

  const val = metrics[metric];

  // If absent or set to 'X', use worst-case default (E, CR, IR, AR) or base default
  if (val === undefined || val === 'X') {
    if (worstCase[metric]) return worstCase[metric];
    return CVSS4_DEFAULTS[metric] || 'N';
  }

  return val;
}

/** Compute the 6-digit MacroVector string for a metrics object. */
function macroVector(metrics) {
  const AV = effectiveValue(metrics, 'AV');
  const PR = effectiveValue(metrics, 'PR');
  const UI = effectiveValue(metrics, 'UI');
  const AC = effectiveValue(metrics, 'AC');
  const AT = effectiveValue(metrics, 'AT');
  const VC = effectiveValue(metrics, 'VC');
  const VI = effectiveValue(metrics, 'VI');
  const VA = effectiveValue(metrics, 'VA');
  const SC = effectiveValue(metrics, 'SC');
  const SI = effectiveValue(metrics, 'SI');
  const SA = effectiveValue(metrics, 'SA');
  const E  = effectiveValue(metrics, 'E');
  const CR = effectiveValue(metrics, 'CR');
  const IR = effectiveValue(metrics, 'IR');
  const AR = effectiveValue(metrics, 'AR');
  const MSI = metrics['MSI'] || 'X';
  const MSA = metrics['MSA'] || 'X';

  // EQ1 (0-2)
  let eq1;
  if (AV === 'N' && PR === 'N' && UI === 'N') eq1 = 0;
  else if ((AV === 'N' || PR === 'N' || UI === 'N') && !(AV === 'N' && PR === 'N' && UI === 'N') && AV !== 'P') eq1 = 1;
  else eq1 = 2;

  // EQ2 (0-1)
  const eq2 = (AC === 'L' && AT === 'N') ? 0 : 1;

  // EQ3 (0-2)
  let eq3;
  if (VC === 'H' && VI === 'H') eq3 = 0;
  else if (VC === 'H' || VI === 'H' || VA === 'H') eq3 = 1;
  else eq3 = 2;

  // EQ4 (0-2) — MSI/MSA take priority
  let eq4;
  if (MSI === 'S' || MSA === 'S') eq4 = 0;
  else if (SC === 'H' || SI === 'H' || SA === 'H') eq4 = 1;
  else eq4 = 2;

  // EQ5 (0-2) — Threat metric E
  let eq5;
  if (E === 'A') eq5 = 0;
  else if (E === 'P') eq5 = 1;
  else eq5 = 2;

  // EQ6 (0-1) — Environmental requirements
  const eq6 = ((CR === 'H' && VC === 'H') || (IR === 'H' && VI === 'H') || (AR === 'H' && VA === 'H')) ? 0 : 1;

  return `${eq1}${eq2}${eq3}${eq4}${eq5}${eq6}`;
}

/** Extract a metric value from a partial vector string like "AV:N/PR:N/". */
function extractFromStr(metric, str) {
  const idx = str.indexOf(metric + ':');
  if (idx === -1) return null;
  const rest = str.slice(idx + metric.length + 1);
  const slashIdx = rest.indexOf('/');
  return slashIdx >= 0 ? rest.slice(0, slashIdx) : rest;
}

/** Compute severity distances between current metrics and a max-vector string. */
function severityDistances(metrics, maxVectorStr) {
  const distances = {};
  for (const metric of Object.keys(METRIC_LEVELS)) {
    const eff = effectiveValue(metrics, metric);
    const maxVal = extractFromStr(metric, maxVectorStr);
    if (maxVal === null) continue;
    distances[metric] = METRIC_LEVELS[metric][eff] - METRIC_LEVELS[metric][maxVal];
  }
  return distances;
}

// ─── Core scoring function ─────────────────────────────────────────────────────

function calculateScore(metrics) {
  // No impact → score 0
  const impactMetrics = ['VC', 'VI', 'VA', 'SC', 'SI', 'SA'];
  if (impactMetrics.every(m => effectiveValue(metrics, m) === 'N')) return 0.0;

  const mv = macroVector(metrics);
  const value = LOOKUP_TABLE[mv];
  if (value === undefined) return null;

  const STEP = 0.1;
  const [eq1, eq2, eq3, eq4, eq5, eq6] = mv.split('').map(Number);

  // Next-lower MacroVector scores for each EQ
  const score_eq1_next  = LOOKUP_TABLE[`${eq1 + 1}${eq2}${eq3}${eq4}${eq5}${eq6}`];
  const score_eq2_next  = LOOKUP_TABLE[`${eq1}${eq2 + 1}${eq3}${eq4}${eq5}${eq6}`];
  const score_eq4_next  = LOOKUP_TABLE[`${eq1}${eq2}${eq3}${eq4 + 1}${eq5}${eq6}`];
  const score_eq5_next  = LOOKUP_TABLE[`${eq1}${eq2}${eq3}${eq4}${eq5 + 1}${eq6}`];

  // EQ3+EQ6 are coupled
  let score_eq3eq6_next;
  if (eq3 === 1 && eq6 === 1) {
    score_eq3eq6_next = LOOKUP_TABLE[`${eq1}${eq2}${eq3 + 1}${eq4}${eq5}${eq6}`];
  } else if (eq3 === 0 && eq6 === 1) {
    score_eq3eq6_next = LOOKUP_TABLE[`${eq1}${eq2}${eq3 + 1}${eq4}${eq5}${eq6}`];
  } else if (eq3 === 1 && eq6 === 0) {
    score_eq3eq6_next = LOOKUP_TABLE[`${eq1}${eq2}${eq3}${eq4}${eq5}${eq6 + 1}`];
  } else if (eq3 === 0 && eq6 === 0) {
    const left  = LOOKUP_TABLE[`${eq1}${eq2}${eq3}${eq4}${eq5}${eq6 + 1}`];
    const right = LOOKUP_TABLE[`${eq1}${eq2}${eq3 + 1}${eq4}${eq5}${eq6}`];
    score_eq3eq6_next = Math.max(left ?? -Infinity, right ?? -Infinity);
    if (!isFinite(score_eq3eq6_next)) score_eq3eq6_next = undefined;
  } else {
    score_eq3eq6_next = LOOKUP_TABLE[`${eq1}${eq2}${eq3 + 1}${eq4}${eq5}${eq6 + 1}`];
  }

  // Build all combinations of max-severity vectors for each EQ
  const eqMaxes = [
    MAX_COMPOSED.eq1[eq1],
    MAX_COMPOSED.eq2[eq2],
    MAX_COMPOSED.eq3[eq3]?.[eq6] ?? [],
    MAX_COMPOSED.eq4[eq4],
    MAX_COMPOSED.eq5[eq5],
  ];

  const maxVectors = [];
  for (const a of eqMaxes[0]) for (const b of eqMaxes[1]) for (const c of eqMaxes[2])
    for (const d of eqMaxes[3]) for (const e of eqMaxes[4]) maxVectors.push(a + b + c + d + e);

  // Find the first max vector where every severity distance ≥ 0
  let distances = null;
  for (const mv of maxVectors) {
    const d = severityDistances(metrics, mv);
    if (Object.values(d).every(v => v >= 0)) { distances = d; break; }
  }
  if (!distances) return value; // Fallback to lookup value

  // Current severity distances per EQ group
  const d_eq1    = (distances.AV ?? 0) + (distances.PR ?? 0) + (distances.UI ?? 0);
  const d_eq2    = (distances.AC ?? 0) + (distances.AT ?? 0);
  const d_eq3eq6 = (distances.VC ?? 0) + (distances.VI ?? 0) + (distances.VA ?? 0) +
                   (distances.CR ?? 0) + (distances.IR ?? 0) + (distances.AR ?? 0);
  const d_eq4    = (distances.SC ?? 0) + (distances.SI ?? 0) + (distances.SA ?? 0);

  // Available distances (MSD) per EQ
  const avail_eq1    = value - score_eq1_next;
  const avail_eq2    = value - score_eq2_next;
  const avail_eq3eq6 = value - score_eq3eq6_next;
  const avail_eq4    = value - score_eq4_next;
  const avail_eq5    = value - score_eq5_next;

  // Max severity depths
  const maxSev_eq1    = MAX_SEVERITY.eq1[eq1] * STEP;
  const maxSev_eq2    = MAX_SEVERITY.eq2[eq2] * STEP;
  const maxSev_eq3eq6 = MAX_SEVERITY.eq3eq6[eq3]?.[eq6] * STEP;
  const maxSev_eq4    = MAX_SEVERITY.eq4[eq4] * STEP;

  // Normalized severities — ignore NaN (no lower macro exists)
  let n = 0;
  let norm_eq1 = 0, norm_eq2 = 0, norm_eq3eq6 = 0, norm_eq4 = 0, norm_eq5 = 0;

  if (!isNaN(avail_eq1)) {
    n++;
    norm_eq1 = avail_eq1 * (d_eq1 / maxSev_eq1);
  }
  if (!isNaN(avail_eq2)) {
    n++;
    norm_eq2 = avail_eq2 * (d_eq2 / maxSev_eq2);
  }
  if (!isNaN(avail_eq3eq6) && maxSev_eq3eq6) {
    n++;
    norm_eq3eq6 = avail_eq3eq6 * (d_eq3eq6 / maxSev_eq3eq6);
  }
  if (!isNaN(avail_eq4)) {
    n++;
    norm_eq4 = avail_eq4 * (d_eq4 / maxSev_eq4);
  }
  if (!isNaN(avail_eq5)) {
    n++;
    // EQ5 percent is always 0
  }

  const meanDistance = n === 0 ? 0 : (norm_eq1 + norm_eq2 + norm_eq3eq6 + norm_eq4 + norm_eq5) / n;

  return roundHalfUp(Math.max(0, Math.min(10, value - meanDistance)));
}

// ─── Public API ────────────────────────────────────────────────────────────────

/** Map a CVSS 4.0 numeric score to a severity label (FIRST thresholds). */
export function scoreToSeverity(score) {
  if (score === null || score === undefined || isNaN(score)) return null;
  if (score >= 9.0) return 'CRITICAL';
  if (score >= 7.0) return 'HIGH';
  if (score >= 4.0) return 'MEDIUM';
  if (score > 0.0)  return 'LOW';
  return 'INFO';
}

/**
 * Build a CVSS 4.0 vector string from a base-metrics object.
 * Only includes the 11 base metrics.
 */
export function buildVector(metrics) {
  const parts = BASE_METRIC_ORDER.map(k => `${k}:${metrics[k] || CVSS4_DEFAULTS[k]}`);
  return `CVSS:4.0/${parts.join('/')}`;
}

/**
 * Parse a CVSS 4.0 vector string into a metrics object.
 * Returns { metrics, isValid, error }.
 */
export function parseVector(vectorString) {
  if (!vectorString || typeof vectorString !== 'string') {
    return { metrics: null, isValid: false, error: 'Empty vector' };
  }
  const trimmed = vectorString.trim();
  if (!trimmed.startsWith('CVSS:4.0/')) {
    return { metrics: null, isValid: false, error: 'Must start with CVSS:4.0/' };
  }

  const metrics = {};
  const parts = trimmed.replace('CVSS:4.0/', '').split('/');
  for (const part of parts) {
    const [k, v] = part.split(':');
    if (k && v) metrics[k] = v;
  }

  // Validate required base metrics
  for (const key of BASE_METRIC_ORDER) {
    if (!metrics[key]) {
      return { metrics, isValid: false, error: `Missing metric: ${key}` };
    }
    const validVals = CVSS4_METRICS[key]?.options.map(o => o.value) || [];
    if (validVals.length && !validVals.includes(metrics[key])) {
      return { metrics, isValid: false, error: `Invalid value for ${key}: ${metrics[key]}` };
    }
  }

  return { metrics, isValid: true, error: null };
}

/**
 * Calculate score + severity from a vector string.
 * Returns { score, severity, isValid, error }.
 */
export function vectorToScore(vectorString) {
  const { metrics, isValid, error } = parseVector(vectorString);
  if (!isValid) return { score: null, severity: null, isValid: false, error };

  const score = calculateScore(metrics);
  if (score === null) return { score: null, severity: null, isValid: false, error: 'Could not calculate score' };

  return { score, severity: scoreToSeverity(score), isValid: true, error: null };
}

/**
 * Calculate score + severity from a metrics object.
 * Returns { score, severity, vector }.
 */
export function metricsToScore(metrics) {
  const vector = buildVector(metrics);
  const score  = calculateScore(metrics);
  return { score, severity: scoreToSeverity(score), vector };
}
