/**
 * Standardized Disaster & Emergency Management Utility Types
 * Used consistently across Shared Inventory, Command Center, and Lantaw AI Extraction.
 */
export const UTILITY_TYPES = [
  "Medical & First Aid",
  "Water Search & Rescue",
  "Land Search & Rescue",
  "Communication Equipment",
  "Power & Lighting",
  "Logistics & Transportation",
  "Fire & Hazard Response",
  "Heavy Equipment & Clearing Tools",
  "Evacuation & Relief Supplies",
  "General / Multi-Purpose Equipment"
];

export const STORAGE_KEY_CUSTOM_TYPES = "floodwatch_custom_utility_types";
export const UTILITY_TYPES_EVENT = "floodwatch_utility_types_updated";

/**
 * Retrieve user-created custom utility types from localStorage
 */
export function getCustomUtilityTypes() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_TYPES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Error reading custom utility types:", e);
    return [];
  }
}

/**
 * Check if a given type is a user-added custom type (or typo to be deleted)
 */
export function isCustomUtilityType(typeName) {
  if (!typeName) return false;
  const trimmed = typeName.trim().toLowerCase();
  const isStandard = UTILITY_TYPES.some(t => t.toLowerCase() === trimmed);
  return !isStandard;
}

/**
 * Add a new custom utility type, persisting to localStorage and dispatching update event
 */
export function addCustomUtilityType(newType) {
  if (typeof window === "undefined") return [];
  const trimmed = (newType || "").trim();
  if (!trimmed) return getCustomUtilityTypes();

  // If it's already one of the standard types, don't duplicate
  const isStandard = UTILITY_TYPES.some(t => t.toLowerCase() === trimmed.toLowerCase());
  if (isStandard) return getCustomUtilityTypes();

  const current = getCustomUtilityTypes();
  const exists = current.some(t => t.toLowerCase() === trimmed.toLowerCase());
  if (exists) return current;

  const updated = [...current, trimmed];
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_TYPES, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(UTILITY_TYPES_EVENT, { detail: updated }));
  } catch (e) {
    console.error("Error saving custom utility type:", e);
  }
  return updated;
}

/**
 * Remove a custom utility type from localStorage (e.g. typo correction)
 */
export function removeCustomUtilityType(typeToRemove) {
  if (typeof window === "undefined") return [];
  const trimmed = (typeToRemove || "").trim();
  const current = getCustomUtilityTypes();
  const updated = current.filter(t => t.toLowerCase() !== trimmed.toLowerCase());
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_TYPES, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(UTILITY_TYPES_EVENT, { detail: updated }));
  } catch (e) {
    console.error("Error deleting custom utility type:", e);
  }
  return updated;
}

/**
 * Helper to ensure standard options + custom options + current value are merged
 */
export function getStandardUtilityOptions(currentValue = "") {
  const custom = getCustomUtilityTypes();
  const combined = [...custom, ...UTILITY_TYPES];
  if (currentValue && !combined.some(t => t.toLowerCase() === currentValue.toLowerCase())) {
    return [currentValue, ...combined];
  }
  return combined;
}
