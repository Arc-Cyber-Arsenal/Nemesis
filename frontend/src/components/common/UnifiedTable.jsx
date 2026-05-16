import { useState } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight } from '../icons';

/**
 * UnifiedTable - Reusable table component with CRUD operations
 *
 * @param {string} title - Table title
 * @param {array} data - Array of data items
 * @param {array} columns - Column definitions: [{ key, label, render?, className? }]
 * @param {function} onAdd - Callback when Add is clicked
 * @param {function} onEdit - Callback when Edit is clicked (item)
 * @param {function} onDelete - Callback when Delete is clicked (itemId)
 * @param {function} renderExpandedContent - Optional: render function for expanded row content (item)
 * @param {boolean} showAdd - Whether to show Add button (default: true)
 * @param {boolean} showEdit - Whether to show Edit button (default: true)
 * @param {boolean} showDelete - Whether to show Delete button (default: true)
 * @param {string} emptyMessage - Message when no data
 * @param {string} addLabel - Label for Add button (default: "Add")
 * @param {ReactNode} customActions - Custom action buttons for each row (receives item)
 */
const UnifiedTable = ({
  title,
  data = [],
  columns = [],
  onAdd,
  onEdit,
  onDelete,
  renderExpandedContent,
  showAdd = true,
  showEdit = true,
  showDelete = true,
  emptyMessage = 'No data yet',
  addLabel = 'Add',
  customActions
}) => {
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleExpanded = (itemId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedRows(newExpanded);
  };

  const handleDelete = async (item) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await onDelete(item.id);
    }
  };

  const hasExpandableContent = !!renderExpandedContent;

  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{title}</h3>
        {showAdd && onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-400 hover:bg-primary-100/50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {addLabel}
          </button>
        )}
      </div>

      {/* Table */}
      {data.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            {/* Table Header */}
            {columns.length > 0 && (
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50">
                  {hasExpandableContent && <th className="w-8"></th>}
                  {columns.map((col, index) => (
                    <th
                      key={col.key || index}
                      className={`px-3 py-2.5 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 ${col.headerClassName || ''}`}
                    >
                      {col.label}
                    </th>
                  ))}
                  {(showEdit || showDelete || customActions) && (
                    <th className="px-3 py-2.5 w-20 text-xs font-semibold text-neutral-700 dark:text-neutral-300"></th>
                  )}
                </tr>
              </thead>
            )}

            {/* Table Body */}
            <tbody>
              {data.map((item) => {
                const isExpanded = expandedRows.has(item.id);

                return (
                  <>
                    {/* Main Row */}
                    <tr
                      key={item.id}
                      className="border-b border-neutral-100 dark:border-neutral-700 last:border-b-0 hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30 transition-colors"
                    >
                      {/* Expand Button */}
                      {hasExpandableContent && (
                        <td className="px-3 py-3">
                          <button
                            onClick={() => toggleExpanded(item.id)}
                            className="p-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      )}

                      {/* Data Columns */}
                      {columns.map((col, index) => (
                        <td
                          key={col.key || index}
                          className={`px-3 py-3 ${col.className || ''}`}
                        >
                          {col.render ? col.render(item) : item[col.key]}
                        </td>
                      ))}

                      {/* Actions Column */}
                      {(showEdit || showDelete || customActions) && (
                        <td className="px-3 py-3 w-20">
                          <div className="flex items-center gap-1 justify-end">
                            {customActions && customActions(item)}
                            {showEdit && onEdit && (
                              <button
                                onClick={() => onEdit(item)}
                                className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-neutral-400 dark:text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {showDelete && onDelete && (
                              <button
                                onClick={() => handleDelete(item)}
                                className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-neutral-400 dark:text-neutral-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Expanded Content Row */}
                    {isExpanded && hasExpandableContent && (
                      <tr className="bg-neutral-50/30 dark:bg-neutral-900/30">
                        <td colSpan={columns.length + (showEdit || showDelete || customActions ? 2 : 1)}>
                          <div className="px-3 py-3">
                            {renderExpandedContent(item)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UnifiedTable;
