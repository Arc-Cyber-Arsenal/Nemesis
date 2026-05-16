/**
 * Command history panel
 */
import React, { useState } from 'react';
import Card from '../common/Card';
import { formatTime, formatExecutionTime } from '../../utils/formatters';

const CommandHistory = ({ commands }) => {
  const [expanded, setExpanded] = useState(null);

  if (!commands || commands.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-neutral-900 mb-3">💻 Command History</h3>
        <p className="text-neutral-400 text-sm italic">No commands executed yet</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">💻 Command History</h3>
        <span className="text-sm text-neutral-500">{commands.length} commands</span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {commands.map((cmd) => (
          <div
            key={cmd.id}
            className="border border-neutral-200 rounded-lg overflow-hidden transition-smooth hover:border-primary-400"
          >
            {/* Command header */}
            <div
              className="flex items-center justify-between p-3 bg-neutral-50 cursor-pointer"
              onClick={() => setExpanded(expanded === cmd.id ? null : cmd.id)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className={`text-lg ${cmd.success ? 'text-success-500' : 'text-error-500'}`}>
                  {cmd.success ? '✅' : '❌'}
                </span>
                <code className="text-sm font-mono text-neutral-900 truncate">
                  {cmd.command}
                </code>
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-500">
                <span>{formatTime(cmd.created_at)}</span>
                <span>{formatExecutionTime(cmd.execution_time)}</span>
                <span className="text-neutral-400">
                  {expanded === cmd.id ? '▼' : '▶'}
                </span>
              </div>
            </div>

            {/* Command output (expanded) */}
            {expanded === cmd.id && (
              <div className="p-3 bg-white border-t border-neutral-200">
                {cmd.stdout && (
                  <div className="mb-3">
                    <label className="text-xs font-medium text-neutral-600 uppercase">Output</label>
                    <pre className="mt-1 text-xs text-neutral-900 bg-neutral-50 p-3 rounded overflow-x-auto font-mono whitespace-pre-wrap">
                      {cmd.stdout}
                    </pre>
                  </div>
                )}

                {cmd.stderr && (
                  <div>
                    <label className="text-xs font-medium text-error-600 uppercase">Error</label>
                    <pre className="mt-1 text-xs text-error-700 bg-error-50 p-3 rounded overflow-x-auto font-mono whitespace-pre-wrap">
                      {cmd.stderr}
                    </pre>
                  </div>
                )}

                <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
                  <span>Return code: {cmd.returncode}</span>
                  {cmd.container_name && <span>Container: {cmd.container_name}</span>}
                  {cmd.phase && <span>Phase: {cmd.phase}</span>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default CommandHistory;
