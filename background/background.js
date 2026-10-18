/**
 * Background Service Worker / Script for AWS Builder Badges Add-on
 */

/* global StreakManager, AppStorage, BADGES_DATA, RECURRING_ACTIVITIES */

const browserAPI = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null);

// Import scripts if running in Web Worker (MV3)
if (typeof importScripts === 'function') {
  try {
    importScripts('../common/badges-data.js', '../common/streak-manager.js', '../common/storage.js');
  } catch (e) {
    console.error('importScripts error:', e);
  }
}

const getStreakManager = () => (typeof globalThis !== 'undefined' && globalThis.StreakManager) || (typeof StreakManager !== 'undefined' ? StreakManager : null);
const getAppStorage = () => (typeof globalThis !== 'undefined' && globalThis.AppStorage) || (typeof AppStorage !== 'undefined' ? AppStorage : null);

const ALARM_NAME = 'aws-builder-badges-alarm';

async function updateExtensionBadgeAndAlerts() {
  try {
    const storage = getAppStorage();
    const sm = getStreakManager();
    if (!storage || !sm) return;

    const state = await storage.loadState();
    const now = new Date();
    const { newAlerts } = sm.checkAndResetStreaks(state, now);
    const summary = sm.getSummary(state, now);

    // Save if streaks were updated
    if (newAlerts.length > 0) {
      await AppStorage.saveState(state);
      // Trigger notifications for new missed streak alerts
      if (state.settings && state.settings.notificationsEnabled !== false) {
        for (const alert of newAlerts) {
          showNotification(alert.id, 'AWS Builder Streak Lost', alert.message);
        }
      }
    }

    // Check evening reminder
    const todayKey = summary.todayKey;
    const currentHour = now.getHours();
    const reminderHour = (state.settings && state.settings.reminderHour) || 20;

    if (
      state.settings &&
      state.settings.notificationsEnabled !== false &&
      summary.dailyPending > 0 &&
      currentHour >= reminderHour &&
      state.settings.lastReminderDate !== todayKey
    ) {
      state.settings.lastReminderDate = todayKey;
      await AppStorage.saveState(state);
      showNotification(
        `reminder-${todayKey}`,
        'AWS Builder Streak Reminder',
        `You have ${summary.dailyPending} daily activity${summary.dailyPending > 1 ? 'ies' : ''} left to maintain your streak today!`
      );
    }

    // Update Action Badge in browser toolbar
    updateToolbarBadge(summary);
  } catch (err) {
    console.error('Error in updateExtensionBadgeAndAlerts:', err);
  }
}

function updateToolbarBadge(summary) {
  if (!browserAPI) return;
  const action = browserAPI.action || browserAPI.browserAction;
  if (!action) return;

  if (summary.activeAlertsCount > 0) {
    action.setBadgeText({ text: '!' });
    action.setBadgeBackgroundColor({ color: '#dc2626' }); // Red for missed streak alert
    action.setTitle({ title: `AWS Builder Badges: ${summary.activeAlertsCount} streak alert(s) pending!` });
  } else if (summary.dailyPending > 0) {
    action.setBadgeText({ text: String(summary.dailyPending) });
    action.setBadgeBackgroundColor({ color: '#ff9900' }); // AWS Orange for pending activities
    action.setTitle({ title: `AWS Builder Badges: ${summary.dailyPending} daily activity left for today` });
  } else {
    action.setBadgeText({ text: '✓' });
    action.setBadgeBackgroundColor({ color: '#10b981' }); // Green for all daily done
    action.setTitle({ title: 'AWS Builder Badges: All daily activities completed for today!' });
  }
}

function showNotification(id, title, message) {
  if (!browserAPI || !browserAPI.notifications) return;
  try {
    browserAPI.notifications.create(id, {
      type: 'basic',
      iconUrl: browserAPI.runtime.getURL('icons/icon-48.png'),
      title: title,
      message: message
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

// Set up alarms
if (browserAPI && browserAPI.alarms) {
  browserAPI.alarms.create(ALARM_NAME, {
    periodInMinutes: 30
  });

  browserAPI.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      updateExtensionBadgeAndAlerts();
    }
  });
}

// Browser startup & extension install
if (browserAPI && browserAPI.runtime) {
  browserAPI.runtime.onInstalled.addListener(() => {
    updateExtensionBadgeAndAlerts();
  });

  browserAPI.runtime.onStartup.addListener(() => {
    updateExtensionBadgeAndAlerts();
  });

  // Message listener
  browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'REFRESH_BADGE') {
      updateExtensionBadgeAndAlerts().then(() => sendResponse({ success: true }));
      return true;
    } else if (message.type === 'AUTO_RECORD_VISIT') {
      handleAutoVisit().then(res => sendResponse(res));
      return true;
    } else if (message.type === 'NOTIFY_BADGE_UNLOCKED') {
      showNotification(
        `unlocked-${message.badge.id}`,
        '🎉 Badge Unlocked!',
        `Congratulations! You unlocked the "${message.badge.name}" badge!`
      );
      sendResponse({ success: true });
      return true;
    }
  });
}

async function handleAutoVisit() {
  const storage = getAppStorage();
  const sm = getStreakManager();
  if (!storage || !sm) return { success: false, reason: 'Modules not ready' };

  const state = await storage.loadState();
  if (state.settings && state.settings.autoVisitDetection) {
    const res = sm.toggleActivity(state, 'daily_visit', true, new Date());
    await storage.saveState(state);
    const summary = sm.getSummary(state, new Date());
    updateToolbarBadge(summary);
    return { success: true, updated: res.isCompleted, unlockedBadges: res.unlockedBadges };
  }
  return { success: false, reason: 'autoVisitDetection disabled' };
}

// Run initial badge update
updateExtensionBadgeAndAlerts();

