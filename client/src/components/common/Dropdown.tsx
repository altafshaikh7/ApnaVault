import React, { useState, useRef, useEffect } from 'react';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: (DropdownItem | 'divider')[];
  align?: 'left' | 'right';
}

export const Dropdown: React.FC<DropdownProps> = ({ trigger, items, align = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-2 w-48 rounded-lg bg-white shadow-lg border border-slate-200/80 py-1 z-30 focus:outline-none`}
        >
          {items.map((item, index) => {
            if (item === 'divider') {
              return <div key={index} className="my-1 border-t border-slate-100" />;
            }

            return (
              <button
                key={item.id}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-left transition-colors ${
                  item.danger
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {item.icon && <span className="w-4 h-4 shrink-0 text-slate-400">{item.icon}</span>}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
