"use client";

import React, { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import { 
  ChevronDown, 
  Plus, 
  Trash2, 
  Check, 
  Search, 
  X, 
  AlertCircle,
  HelpCircle,
  Tag
} from "lucide-react";
import { 
  UTILITY_TYPES, 
  getCustomUtilityTypes, 
  addCustomUtilityType, 
  removeCustomUtilityType, 
  isCustomUtilityType,
  UTILITY_TYPES_EVENT 
} from "@/lib/constants/utilityTypes";

export default function UtilityTypeSelect({
  value = "",
  onChange,
  placeholder = "Select or add utility type...",
  disabled = false,
  className = "",
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customTypes, setCustomTypes] = useState([]);
  
  // Modals state
  const [typeToAdd, setTypeToAdd] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Sync custom types from storage and listen for global changes
  const loadCustomTypes = () => {
    setCustomTypes(getCustomUtilityTypes());
  };

  useEffect(() => {
    loadCustomTypes();

    const handleUpdate = () => {
      loadCustomTypes();
    };

    window.addEventListener(UTILITY_TYPES_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(UTILITY_TYPES_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm("");
    }
  }, [isOpen]);

  const handleSelect = (selectedType) => {
    if (disabled) return;
    if (onChange) {
      onChange({ target: { value: selectedType } });
    }
    setIsOpen(false);
  };

  // Open confirmation to add type
  const promptAddType = (name) => {
    const trimmed = (name || searchTerm || "").trim();
    if (!trimmed) return;
    setTypeToAdd(trimmed);
    setShowAddModal(true);
  };

  // Confirmed addition
  const confirmAddType = () => {
    if (!typeToAdd.trim()) return;
    const addedList = addCustomUtilityType(typeToAdd.trim());
    setCustomTypes(addedList);
    handleSelect(typeToAdd.trim());
    setShowAddModal(false);
    setTypeToAdd("");
    setSearchTerm("");
    setIsOpen(false);
  };

  // Open confirmation to delete type
  const promptDeleteType = (e, name) => {
    e.stopPropagation();
    if (!name) return;
    setTypeToDelete(name);
    setShowDeleteModal(true);
  };

  // Confirmed deletion
  const confirmDeleteType = () => {
    if (!typeToDelete) return;
    const updatedList = removeCustomUtilityType(typeToDelete);
    setCustomTypes(updatedList);
    // If deleted type is currently selected, clear it
    if (value && value.toLowerCase() === typeToDelete.toLowerCase()) {
      if (onChange) {
        onChange({ target: { value: "" } });
      }
    }
    setShowDeleteModal(false);
    setTypeToDelete("");
  };

  // Filtered lists
  const query = searchTerm.toLowerCase().trim();
  const filteredCustomTypes = customTypes.filter(t => t.toLowerCase().includes(query));
  const filteredStandardTypes = UTILITY_TYPES.filter(t => t.toLowerCase().includes(query));

  // Check if search term is an exact match already
  const allExistingTypes = [...customTypes, ...UTILITY_TYPES];
  const exactMatchExists = allExistingTypes.some(t => t.toLowerCase() === query);
  const canAddNew = query.length > 0 && !exactMatchExists;

  const isCurrentValueCustom = value && isCustomUtilityType(value);

  return (
    <div className={clsx("relative w-full", className)} ref={containerRef}>
      {/* Selector trigger bar */}
      <div className="flex items-center gap-2">
        <div
          onClick={() => !disabled && setIsOpen(prev => !prev)}
          className={clsx(
            "input-layout transition-all duration-200 flex items-center justify-between relative cursor-pointer flex-1 select-none py-2 px-3.5",
            disabled && "bg-gray-100 border-gray-100 opacity-70 cursor-not-allowed",
            isOpen && "ring-2 ring-primary/20 border-primary"
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden pr-2">
            {value ? (
              <span className="text-sm font-medium text-gray-800 truncate">
                {value}
              </span>
            ) : (
              <span className="text-sm text-gray-400 truncate">
                {placeholder}
              </span>
            )}
            {isCurrentValueCustom && (
              <span className="text-[10px] font-semibold tracking-wide bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full shrink-0 border border-blue-100">
                Custom
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* If current value is custom, show inline delete button beside it for quick typo cleanup */}
            {isCurrentValueCustom && !disabled && (
              <button
                type="button"
                onClick={(e) => promptDeleteType(e, value)}
                title="Delete this custom type (typo fix)"
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
            <ChevronDown 
              className={clsx(
                "size-4 text-gray-400 transition-transform duration-200",
                isOpen && "rotate-180"
              )} 
            />
          </div>
        </div>

        {/* Quick "+ New Type" button beside select */}
        {!disabled && (
          <button
            type="button"
            onClick={() => {
              setTypeToAdd("");
              setShowAddModal(true);
            }}
            title="Add a new custom utility type"
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors shrink-0 cursor-pointer h-full"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">New Type</span>
          </button>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in duration-150 max-h-80 flex flex-col">
          {/* Search & Type header */}
          <div className="p-2.5 border-b border-gray-100 bg-gray-50/70 flex flex-col gap-2">
            <div className="relative flex items-center">
              <Search className="size-4 text-gray-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (canAddNew) {
                      promptAddType(searchTerm);
                    }
                  }
                }}
                placeholder="Search or type new utility type..."
                className="w-full text-xs bg-white border border-gray-200 rounded-xl pl-9 pr-8 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-gray-800 placeholder-gray-400 font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-600 rounded-md"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Prompt to add new type if typed text doesn't exist */}
            {canAddNew && (
              <button
                type="button"
                onClick={() => promptAddType(searchTerm)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors text-left"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Plus className="size-3.5 shrink-0" />
                  <span>Add <strong>"{searchTerm.trim()}"</strong></span>
                </span>
                <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full shrink-0 font-bold">
                  + Add
                </span>
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto p-1.5 divide-y divide-gray-50 flex-1">
            {/* Custom Types Section (if any exist) */}
            {filteredCustomTypes.length > 0 && (
              <div className="pb-1.5">
                <div className="px-2.5 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Custom Types</span>
                  <span className="text-[10px] text-gray-400 font-normal">Click trash to delete typo</span>
                </div>
                {filteredCustomTypes.map((type) => {
                  const isSelected = value?.toLowerCase() === type.toLowerCase();
                  return (
                    <div
                      key={type}
                      onClick={() => handleSelect(type)}
                      className={clsx(
                        "group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors",
                        isSelected 
                          ? "bg-primary/10 text-primary font-bold" 
                          : "text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <Tag className="size-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{type}</span>
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded-md font-semibold border border-blue-100">
                          Custom
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isSelected && <Check className="size-4 text-primary shrink-0 mr-1" />}
                        {/* Delete button beside the custom type */}
                        <button
                          type="button"
                          onClick={(e) => promptDeleteType(e, type)}
                          title="Delete this custom type (typo / unneeded)"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Standard Types Section */}
            <div className={clsx(filteredCustomTypes.length > 0 && "pt-1.5")}>
              <div className="px-2.5 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Standard Disaster Utility Types
              </div>
              {filteredStandardTypes.map((type) => {
                const isSelected = value?.toLowerCase() === type.toLowerCase();
                return (
                  <div
                    key={type}
                    onClick={() => handleSelect(type)}
                    className={clsx(
                      "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors",
                      isSelected 
                        ? "bg-primary/10 text-primary font-bold" 
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <span className="truncate">{type}</span>
                    {isSelected && <Check className="size-4 text-primary shrink-0 ml-2" />}
                  </div>
                );
              })}
            </div>

            {filteredCustomTypes.length === 0 && filteredStandardTypes.length === 0 && (
              <div className="py-6 text-center text-xs text-gray-400">
                No matching utility types found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: Add New Utility Type */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="p-6 flex flex-col gap-3 items-center text-center">
              <div className="p-3.5 bg-primary/10 text-primary rounded-full mb-1">
                <Plus className="size-7" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Add New Utility Type</h3>
              <p className="text-xs text-gray-500 max-w-sm">
                Are you sure you want to add this utility type to the options list?
              </p>

              {/* Editable or review input */}
              <div className="w-full mt-2 text-left">
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Utility Type Name:
                </label>
                <input
                  type="text"
                  value={typeToAdd}
                  onChange={(e) => setTypeToAdd(e.target.value)}
                  placeholder="e.g. Marine Search & Rescue"
                  autoFocus
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-800 font-semibold outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setTypeToAdd("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!typeToAdd.trim()}
                onClick={confirmAddType}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="size-4" />
                Yes, Add Utility Type
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: Delete Utility Type (for typos/unneeded) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="p-6 flex flex-col gap-3 items-center text-center">
              <div className="p-3.5 bg-red-50 text-red-600 rounded-full mb-1">
                <Trash2 className="size-7" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Delete Utility Type?</h3>
              <p className="text-xs text-gray-500 max-w-sm">
                Are you sure you want to remove this custom utility type? (In case of a typo or unneeded entry)
              </p>

              <div className="w-full bg-red-50/60 border border-red-100 rounded-xl p-3 text-center mt-1">
                <span className="text-xs font-bold text-red-800">{typeToDelete}</span>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setTypeToDelete("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteType}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="size-4" />
                Yes, Delete Type
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
