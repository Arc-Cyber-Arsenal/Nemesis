import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'aida_pinned_assessments';
const EVENT_NAME = 'aida:pinned-assessments-changed';

const readPinned = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
};

const writePinned = (ids) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
};

export function usePinnedAssessments() {
  const [pinnedIds, setPinnedIds] = useState(readPinned);

  useEffect(() => {
    const sync = () => setPinnedIds(readPinned());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const isPinned = useCallback((id) => pinnedIds.includes(Number(id)), [pinnedIds]);

  const togglePin = useCallback((id) => {
    const numId = Number(id);
    const current = readPinned();
    const next = current.includes(numId)
      ? current.filter((i) => i !== numId)
      : [...current, numId];
    writePinned(next);
  }, []);

  return { pinnedIds, isPinned, togglePin };
}
