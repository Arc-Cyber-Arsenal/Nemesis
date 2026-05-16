import { useState, useRef, useEffect } from 'react';
import { CheckCircle, Clock, Archive, ChevronDown } from '../icons';

const StatusDropdown = ({
  currentStatus,
  onStatusChange,
  disabled = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  const statusOptions = [
    {
      value: 'active',
      label: 'Active',
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      value: 'completed',
      label: 'Completed',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      value: 'archived',
      label: 'Archived',
      icon: Archive,
      color: 'text-neutral-600',
      bgColor: 'bg-neutral-100'
    }
  ];

  const currentOption = statusOptions.find(opt => opt.value === currentStatus) || statusOptions[0];

  // Calculate dropdown position and direction
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 120; // Approximate height of dropdown with 3 items
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;

      // Determine if should open upward or downward based on available space
      const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      // Calculate fixed position
      setDropdownPosition({
        top: shouldOpenUpward ? buttonRect.top - dropdownHeight - 5 : buttonRect.bottom + 5,
        left: buttonRect.left
      });
    }
  }, [isOpen]);

  const handleStatusChange = (newStatus) => {
    if (newStatus !== currentStatus) {
      onStatusChange(newStatus);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full transition-colors ${
          disabled
            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
            : `${currentOption.bgColor} hover:opacity-80`
        }`}
      >
        <span className={`text-xs font-medium ${currentOption.color}`}>{currentOption.label}</span>
        <ChevronDown className={`w-3 h-3 ${currentOption.color} transition-transform ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {isOpen && !disabled && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown - Using fixed positioning to escape overflow constraints */}
          <div
            className="fixed w-40 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-lg z-[70]"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`
            }}
          >
            {statusOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = option.value === currentStatus;
              
              return (
                <button
                  key={option.value}
                  onClick={() => handleStatusChange(option.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-colors ${
                    isSelected
                      ? 'bg-primary-100/50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                  }`}
                >
                  <Icon className={`w-3 h-3 ${option.color}`} />
                  <span className={option.color}>{option.label}</span>
                  {isSelected && (
                    <div className="ml-auto w-1.5 h-1.5 bg-primary-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default StatusDropdown;
