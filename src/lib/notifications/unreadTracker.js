// Helper to track viewed timestamps in localStorage so notification indicators clear upon viewing
const STORAGE_REPORT_KEY = 'fw_last_viewed_report_time';
const STORAGE_LGU_KEY = 'fw_last_viewed_lgu_time';
const STORAGE_REQUEST_KEY = 'fw_last_viewed_request_time';

export const getStoredViewTime = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const setStoredViewTime = (key) => {
  if (typeof window === 'undefined') return;
  try {
    const now = new Date().toISOString();
    localStorage.setItem(key, now);
    window.dispatchEvent(new Event('fw_notification_viewed'));
  } catch (e) {
    console.error('Error saving view time:', e);
  }
};

export const NOTIF_KEYS = {
  REPORT: STORAGE_REPORT_KEY,
  LGU: STORAGE_LGU_KEY,
  REQUEST: STORAGE_REQUEST_KEY,
};
