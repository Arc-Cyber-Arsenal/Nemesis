import React, { useState } from 'react';
import { AlertTriangle, Info, Eye } from '../icons';
import EditableField from '../common/EditableField';
import MarkdownRenderer from '../common/MarkdownRenderer';
import apiClient from '../../services/api';
import { getSeverityTextClass } from '../../utils/severity';
import { PHASE_NAMES } from '../../utils/phases';

const PhaseContentViewSimple = ({ phaseNumber, assessmentId, section, onUpdate, cards, commands }) => {
  const [isEditing, setIsEditing] = useState(false);

  const updateContent = async (newContent) => {
    try {
      await apiClient.post(`/assessments/${assessmentId}/sections`, {
        section_type: `phase_${phaseNumber}`,
        section_number: phaseNumber,
        title: PHASE_NAMES[phaseNumber],
        content: newContent,
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to update phase content:', error);
    }
  };


  return (
    <div className="space-y-8">
      {/* Header de la Phase */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Phase {phaseNumber} - {PHASE_NAMES[phaseNumber]}
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {cards.length} cards
          </p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 px-3 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        >
          {isEditing ? 'Done' : 'Edit Notes'}
        </button>
      </div>

      {/* Séparateur */}
      <div className="border-t border-gray-200 dark:border-neutral-700"></div>

      {/* Notes de la Phase - Sans cadre */}
      <div>
        <h4 className="text-lg font-medium text-neutral-800 dark:text-neutral-200 mb-4">Notes</h4>
        {isEditing ? (
          <EditableField
            value={section?.content || ''}
            onSave={(newContent) => {
              updateContent(newContent);
              setIsEditing(false);
            }}
            multiline
            placeholder="Click to add notes for this phase..."
            className="text-neutral-700 dark:text-neutral-300 text-base min-h-[200px] block w-full p-4 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 leading-relaxed focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        ) : (
          <div className="min-h-[120px]">
            {section?.content ? (
              <div className="prose-custom">
                <MarkdownRenderer content={section.content} />
              </div>
            ) : (
              <div className="text-neutral-500 dark:text-neutral-400 italic py-8">
                No notes for this phase yet. Click "Edit Notes" to add content.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Activity Line - Cards */}
      {cards.length > 0 && (
        <div>
          <h4 className="text-lg font-medium text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Cards ({cards.length})
          </h4>

          <div className="space-y-3">
            {cards.map((card) => (
              <div key={card.id} className="flex items-start gap-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg border-l-4 border-neutral-300 dark:border-neutral-600">
                <div className="flex items-center gap-2 mt-0.5">
                  {card.card_type === 'finding' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                  {card.card_type === 'observation' && <Eye className="w-4 h-4 text-blue-500" />}
                  {card.card_type === 'info' && <Info className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />}
                  <span className="text-xs font-medium uppercase tracking-wide bg-neutral-200 dark:bg-neutral-700 px-2 py-1 rounded text-neutral-700 dark:text-neutral-300">
                    {card.card_type}
                  </span>
                </div>

                <div className="flex-1">
                  <h5 className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">{card.title}</h5>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">{card.target_service}</p>
                  <div className="text-sm text-neutral-700 dark:text-neutral-300">
                    {card.technical_analysis || card.notes || card.context || ''}
                  </div>
                </div>

                {card.severity && (
                  <div className={`text-sm font-medium px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-700 ${getSeverityTextClass(card.severity)}`}>
                    {card.severity}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default PhaseContentViewSimple;
