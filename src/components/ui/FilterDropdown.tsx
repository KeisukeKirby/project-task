import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface FilterDropdownProps {
  label: React.ReactNode;
  options: { id: string; label: string; color?: string }[];
  selectedIds: string[];
  onChange: (selected: string[]) => void;
  title?: string;
}

export function FilterDropdown({ label, options, selectedIds, onChange, title = 'すべて' }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleOption = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(x => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 bg-surface-0 border border-surface-200 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors ${isOpen ? 'ring-2 ring-primary-100 border-primary-300 bg-primary-50 text-primary-700' : 'text-surface-700 hover:bg-surface-50'}`}
      >
        {label} <ChevronDown className="w-3.5 h-3.5 text-surface-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 bg-surface-0 border border-surface-200 rounded-xl shadow-lg py-2 z-50 min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-xs text-surface-500 font-bold mb-2 px-3 pb-2 border-b border-surface-100">
            {title}
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {options.map(opt => (
              <label key={opt.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-surface-50 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(opt.id)}
                  onChange={() => toggleOption(opt.id)}
                  className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4 border-surface-300"
                />
                {opt.color && (
                  <div className={`w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: opt.color }}></div>
                )}
                <span className="text-sm text-surface-700 truncate">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
