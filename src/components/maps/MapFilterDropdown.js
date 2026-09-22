"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown, Check } from 'lucide-react';

export default function MapFilterDropdown({
  options = [],
  value,
  onChange,
  placeholder = "Filter",
  icon: Icon = Filter,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  const handleSelect = (optValue) => {
    onChange?.(optValue);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* ── Dropdown Trigger Button ── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 bg-white/95 backdrop-blur-md border border-gray-200/90 shadow-md hover:shadow-lg hover:border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 transition-all cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Icon className="size-3.5 text-primary shrink-0" />
        
        {/* Selected item with indicator dot */}
        <div className="flex items-center gap-1.5 truncate max-w-[160px] sm:max-w-[200px]">
          {selectedOption?.color && (
            <span
              className="size-2.5 rounded-full shrink-0 shadow-2xs"
              style={{ backgroundColor: selectedOption.color }}
            />
          )}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </div>

        <ChevronDown
          className={`size-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* ── Dropdown Menu Popover ── */}
      {isOpen && (
        <div 
          className="absolute left-0 mt-1.5 w-60 sm:w-68 origin-top-left rounded-2xl bg-white/95 backdrop-blur-md shadow-2xl border border-gray-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-1.5 focus:outline-none"
          role="listbox"
        >
          {/* Header Label */}
          <div className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 border-b border-gray-100 flex items-center justify-between">
            <span>Filter Categories</span>
            <span className="text-[10px] font-medium text-gray-400 lowercase">{options.length} options</span>
          </div>

          <div className="max-h-64 overflow-y-auto py-1 space-y-0.5">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer group text-left ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    {/* Color dot */}
                    {option.color ? (
                      <span
                        className={`size-2.5 rounded-full shrink-0 shadow-2xs transition-transform group-hover:scale-110 ${
                          isSelected ? 'ring-2 ring-primary/30 ring-offset-1' : ''
                        }`}
                        style={{ backgroundColor: option.color }}
                      />
                    ) : (
                      <span className="size-2.5 rounded-full shrink-0 bg-gray-300" />
                    )}

                    <div className="truncate">
                      <span className="block truncate">{option.label}</span>
                      {option.sublabel && (
                        <span className="block text-[10px] text-gray-400 font-normal truncate">
                          {option.sublabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {option.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
                          isSelected
                            ? 'bg-primary/20 text-primary'
                            : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                        }`}
                      >
                        {option.badge}
                      </span>
                    )}

                    {isSelected && (
                      <Check className="size-4 text-primary shrink-0 stroke-[2.5]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
