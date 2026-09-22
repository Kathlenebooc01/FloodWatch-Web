"use client";

import React from 'react';
import { CloudLightning } from 'lucide-react';

const SSA_LEVELS = [
  { ssa: 1, label: 'SSA 1', height: '0.5m - 1.0m', full: 'Advisory 1 (0.5m - 1.0m)' },
  { ssa: 2, label: 'SSA 2', height: '1.01m - 2.0m', full: 'Advisory 2 (1.01m - 2.0m)' },
  { ssa: 3, label: 'SSA 3', height: '2.01m - 3.0m', full: 'Advisory 3 (2.01m - 3.0m)' },
  { ssa: 4, label: 'SSA 4', height: '> 3.0m', full: 'Advisory 4 (> 3.0m)' },
];

export default function StormSurgeAdvisorySelector({ activeSSA, onSSAChange }) {
  return (
    <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-gray-200/80 animate-in fade-in zoom-in-95 duration-150">
      <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-gray-600 border-r border-gray-200">
        <CloudLightning className="size-3.5 text-amber-500" />
        <span>Advisory:</span>
      </div>
      <div className="flex items-center gap-1">
        {SSA_LEVELS.map((item) => {
          const isActive = activeSSA === item.ssa;
          return (
            <button
              key={item.ssa}
              type="button"
              onClick={() => onSSAChange(item.ssa)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                isActive
                  ? 'bg-amber-500 text-white shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title={item.full}
            >
              <span>{item.label}</span>
              <span className={`text-[10px] hidden sm:inline ${isActive ? 'text-amber-100' : 'text-gray-400 font-normal'}`}>
                ({item.height})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
