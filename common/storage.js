/**
 * Storage & State Persistence Layer for AWS Builder Badges Add-on
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const StreakManager = require('./streak-manager');
    module.exports = factory(StreakManager);
  } else {
    const sm = (typeof globalThis !== 'undefined' && globalThis.StreakManager) || root.StreakManager;
    const storage = factory(sm);
    root.AppStorage = storage;
    if (typeof globalThis !== 'undefined') {
      globalThis.AppStorage = storage;
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function (StreakManager) {
  'use strict';

  function getStreakManager() {
    return StreakManager || (typeof globalThis !== 'undefined' && globalThis.StreakManager) || (typeof window !== 'undefined' && window.StreakManager);
  }

  const STORAGE_KEY = 'aws_builder_badges_data';
  const getBrowserAPI = () => (typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null));

  async function loadState() {
    const api = getBrowserAPI();
    const sm = getStreakManager();
    let state = null;

    if (api && api.storage && api.storage.local) {
      try {
        const result = await api.storage.local.get(STORAGE_KEY);
        state = result[STORAGE_KEY];
      } catch (err) {
        console.error('Failed to load state from browser.storage:', err);
      }
    } else if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) state = JSON.parse(raw);
      } catch (err) {
        console.error('Failed to load from localStorage:', err);
      }
    }

    if (!state) {
      state = sm ? sm.createInitialState() : { activities: {}, badges: {}, alerts: [], settings: {} };
      await saveState(state);
    } else {
      // Validate schema completeness
      if (sm) {
        const defaultState = sm.createInitialState();
        state.activities = Object.assign({}, defaultState.activities, state.activities);
        state.badges = Object.assign({}, defaultState.badges, state.badges);
        state.settings = Object.assign({}, defaultState.settings, state.settings);
        if (!Array.isArray(state.alerts)) state.alerts = [];

        // Check and update streaks on load
        const { newAlerts } = sm.checkAndResetStreaks(state, new Date());
        if (newAlerts && newAlerts.length > 0) {
          await saveState(state);
        }
      }
    }

    return state;
  }

  async function saveState(state) {
    const api = getBrowserAPI();
    if (api && api.storage && api.storage.local) {
      try {
        await api.storage.local.set({ [STORAGE_KEY]: state });
      } catch (err) {
        console.error('Failed to save state to browser.storage:', err);
      }
    } else if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (err) {
        console.error('Failed to save to localStorage:', err);
      }
    }
    return state;
  }

  async function resetAllData() {
    const sm = getStreakManager();
    const fresh = sm ? sm.createInitialState() : { activities: {}, badges: {}, alerts: [], settings: {} };
    await saveState(fresh);
    return fresh;
  }

  function exportDataAsJSON(state) {
    return JSON.stringify(state, null, 2);
  }

  async function importDataFromJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !parsed.activities || !parsed.badges) {
        throw new Error('Invalid backup file structure: missing activities or badges.');
      }
      const sm = getStreakManager();
      const defaultState = sm ? sm.createInitialState() : { activities: {}, badges: {}, alerts: [], settings: {} };
      const state = {
        version: parsed.version || 1,
        activities: Object.assign({}, defaultState.activities, parsed.activities),
        badges: Object.assign({}, defaultState.badges, parsed.badges),
        alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
        settings: Object.assign({}, defaultState.settings, parsed.settings || {})
      };
      await saveState(state);
      return { success: true, state };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  return {
    STORAGE_KEY,
    loadState,
    saveState,
    resetAllData,
    exportDataAsJSON,
    importDataFromJSON
  };
});

