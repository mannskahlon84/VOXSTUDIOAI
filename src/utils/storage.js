const memoryStore = {};

export const safeStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`localStorage getItem failed for key: ${key}`, e);
      return memoryStore[key] || null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`localStorage setItem failed for key: ${key}`, e);
      memoryStore[key] = String(value);
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`localStorage removeItem failed for key: ${key}`, e);
      delete memoryStore[key];
    }
  }
};

export const safeJsonParse = (str, fallback) => {
  try {
    if (!str) return fallback;
    if (str === 'undefined') return fallback;
    return JSON.parse(str);
  } catch (e) {
    console.warn("Failed to parse JSON string:", str, e);
    return fallback;
  }
};
