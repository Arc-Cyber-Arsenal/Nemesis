/**
 * Custom hook for assessment data management
 */
import { useState, useEffect } from 'react';
import assessmentService from '../services/assessmentService';
import cardService from '../services/cardService';
import reconService from '../services/reconService';
import commandService from '../services/commandService';
import sectionService from '../services/sectionService';

export const useAssessment = (assessmentId) => {
  const [assessment, setAssessment] = useState(null);
  const [cards, setCards] = useState([]);
  const [reconData, setReconData] = useState({});
  const [commands, setCommands] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAssessment = async () => {
    try {
      const data = await assessmentService.getById(assessmentId);
      setAssessment(data);
    } catch (err) {
      console.error('Error loading assessment:', err);
      setError('Failed to load assessment');
    }
  };

  const loadCards = async () => {
    try {
      const data = await cardService.getAll(assessmentId);
      setCards(data);
    } catch (err) {
      console.error('Error loading cards:', err);
    }
  };

  const loadReconData = async () => {
    try {
      const data = await reconService.getAllGrouped(assessmentId);
      setReconData(data);
    } catch (err) {
      console.error('Error loading recon data:', err);
    }
  };

  const loadCommands = async () => {
    try {
      const data = await commandService.getHistory(assessmentId, 50);
      setCommands(data);
    } catch (err) {
      console.error('Error loading commands:', err);
    }
  };

  const loadSections = async () => {
    try {
      const data = await sectionService.getAll(assessmentId);
      setSections(data);
    } catch (err) {
      console.error('Error loading sections:', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadAssessment(),
        loadCards(),
        loadReconData(),
        loadCommands(),
        loadSections(),
      ]);
    } catch (err) {
      setError('Failed to load assessment data');
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    loadAllData();
  };

  useEffect(() => {
    if (assessmentId) {
      loadAllData();
    }
  }, [assessmentId]);

  return {
    assessment,
    cards,
    reconData,
    commands,
    sections,
    loading,
    error,
    refresh,
  };
};

export default useAssessment;
