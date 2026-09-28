"use client";

import React from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

export default function SelectInput({
  className,
  options = [],
  placeholder = "Select an option...",
  disabled,
  value = "",
  onChange,
  required,
  ...props
}) {
  return (
    <fieldset
      className={clsx(
        className,
        'input-layout transition-all duration-200 flex items-center justify-between relative cursor-pointer',
        disabled && 'bg-gray-100 border-gray-100 opacity-70 cursor-not-allowed select-none'
      )}
    >
      <select
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={clsx(
          'outline-0 bg-transparent text-sm border-0 w-full flex-1 appearance-none cursor-pointer pr-7 py-1',
          !value ? 'text-gray-400' : 'text-gray-800 font-medium',
          disabled && 'text-gray-400 cursor-not-allowed'
        )}
        {...props}
      >
        <option value="" disabled className="text-gray-400">
          {placeholder}
        </option>
        {options.map((opt) => {
          const optValue = typeof opt === 'string' ? opt : opt.value;
          const optLabel = typeof opt === 'string' ? opt : opt.label;
          return (
            <option key={optValue} value={optValue} className="text-gray-800 bg-white">
              {optLabel}
            </option>
          );
        })}
      </select>
      <ChevronDown className="size-4 text-gray-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 shrink-0 transition-transform" />
    </fieldset>
  );
}
