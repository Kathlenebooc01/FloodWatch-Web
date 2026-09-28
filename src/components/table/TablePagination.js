"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function TablePagination({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  alwaysShow = true
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  if (totalItems === 0) return null;
  if (!alwaysShow && totalItems <= itemsPerPage) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3.5 border-t border-gray-100 bg-gray-50/70 sm:px-6 rounded-b-xl gap-4 select-none">
      <div className="hidden sm:block shrink-0">
        <p className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
          Showing <span className="font-bold text-gray-800">{startItem}</span> to <span className="font-bold text-gray-800">{endItem}</span> of <span className="font-bold text-gray-800">{totalItems}</span> results
        </p>
      </div>

      <div className="flex-1 flex items-center justify-between sm:justify-end gap-2 w-full">
        <button
          type="button"
          onClick={() => onPageChange && onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="relative inline-flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer"
        >
          <ChevronLeft className="size-4" />
          <span>Previous</span>
        </button>

        <span className="flex items-center text-xs font-semibold text-gray-600 whitespace-nowrap px-2">
          Page {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange && onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="relative inline-flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
