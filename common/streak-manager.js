/**
 * Streak Manager & Date Logic for AWS Builder Badges Add-on
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const { BADGES_DATA, RECURRING_ACTIVITIES } = require('./badges-data');
    module.exports = factory(BADGES_DATA, RECURRING_ACTIVITIES);
  } else {
    const bData = (typeof globalThis !== 'undefined' && globalThis.BADGES_DATA) || root.BADGES_DATA;
    const rAct = (typeof globalThis !== 'undefined' && globalThis.RECURRING_ACTIVITIES) || root.RECURRING_ACTIVITIES;
    const manager = factory(bData, rAct);
    root.StreakManager = manager;
    if (typeof globalThis !== 'undefined') {
      globalThis.StreakManager = manager;
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function (BADGES_DATA, RECURRING_ACTIVITIES) {
  'use strict';

  const badgesList = BADGES_DATA || (typeof globalThis !== 'undefined' && globalThis.BADGES_DATA) || [];
  const activitiesList = RECURRING_ACTIVITIES || (typeof globalThis !== 'undefined' && globalThis.RECURRING_ACTIVITIES) || [];

  function getBadges() {
    return (badgesList && badgesList.length) ? badgesList : ((typeof globalThis !== 'undefined' && globalThis.BADGES_DATA) || []);
  }

  function getActivities() {
    return (activitiesList && activitiesList.length) ? activitiesList : ((typeof globalThis !== 'undefined' && globalThis.RECURRING_ACTIVITIES) || []);
  }

  function getLocalDateKey(date = new Date()) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseDateKey(key) {
    if (!key || typeof key !== 'string') return 0;
    const parts = key.split('-').map(Number);
    if (parts.length !== 3) return 0;
    return Date.UTC(parts[0], parts[1] - 1, parts[2]);
  }

  function daysBetween(fromKey, toKey) {
    const fromTime = parseDateKey(fromKey);
    const toTime = parseDateKey(toKey);
    return Math.round((toTime - fromTime) / 86400000);
  }

  function getWeekMondayKey(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return getLocalDateKey(monday);
  }

  function weeksBetween(fromMondayKey, toMondayKey) {
    const days = daysBetween(fromMondayKey, toMondayKey);
    return Math.round(days / 7);
  }

  function getNextDailyReset(now = new Date()) {
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    return nextMidnight.getTime();
  }

  function getNextWeeklyReset(now = new Date()) {
    const d = new Date(now);
    const day = d.getDay();
    const daysUntilNextMonday = day === 0 ? 1 : 8 - day;
    const nextMonday = new Date(d);
    nextMonday.setDate(d.getDate() + daysUntilNextMonday);
    nextMonday.setHours(0, 0, 0, 0);
    return nextMonday.getTime();
  }

  function createInitialState() {
    const activities = {};
    for (const act of getActivities()) {
      activities[act.id] = {
        id: act.id,
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: null,
        previousCompletedDate: null,
        history: []
      };
    }

    const badges = {};
    for (const b of getBadges()) {
      badges[b.id] = {
        id: b.id,
        completed: false,
        completedAt: null,
        progress: 0
      };
    }

    return {
      version: 1,
      activities,
      badges,
      alerts: [],
      settings: {
        notificationsEnabled: true,
        reminderHour: 20, // 8 PM daily reminder if pending
        autoVisitDetection: true,
        lastReminderDate: null
      }
    };
  }

  /**
   * Evaluates streaks and generates missed alerts if any streak broke
   */
  function checkAndResetStreaks(state, now = new Date()) {
    if (!state || !state.activities) return { state, newAlerts: [] };

    const todayKey = getLocalDateKey(now);
    const currentWeekMonday = getWeekMondayKey(now);
    const newAlerts = [];

    if (!Array.isArray(state.alerts)) {
      state.alerts = [];
    }

    for (const actDef of getActivities()) {
      const act = state.activities[actDef.id];
      if (!act) continue;

      if (actDef.period === 'daily') {
        if (act.lastCompletedDate) {
          const diff = daysBetween(act.lastCompletedDate, todayKey);
          if (diff > 1) {
            // Day was missed!
            if (act.currentStreak > 0) {
              const alert = {
                id: `missed-${actDef.id}-${act.lastCompletedDate}-${todayKey}`,
                activityId: actDef.id,
                activityName: actDef.name,
                period: 'daily',
                missedSince: act.lastCompletedDate,
                daysMissed: diff - 1,
                lostStreak: act.currentStreak,
                detectedAt: new Date(now).toISOString(),
                dismissed: false,
                message: `Streak reset: You missed ${diff - 1} day${diff - 1 > 1 ? 's' : ''} on "${actDef.name}". Your ${act.currentStreak}-day streak was reset.`
              };
              newAlerts.push(alert);
              state.alerts.unshift(alert);
              act.currentStreak = 0;
            }
          }
        }
      } else if (actDef.period === 'weekly') {
        if (act.lastCompletedDate) {
          const diffWeeks = weeksBetween(act.lastCompletedDate, currentWeekMonday);
          if (diffWeeks > 1) {
            // Week was missed!
            if (act.currentStreak > 0) {
              const alert = {
                id: `missed-${actDef.id}-${act.lastCompletedDate}-${currentWeekMonday}`,
                activityId: actDef.id,
                activityName: actDef.name,
                period: 'weekly',
                missedSince: act.lastCompletedDate,
                weeksMissed: diffWeeks - 1,
                lostStreak: act.currentStreak,
                detectedAt: new Date(now).toISOString(),
                dismissed: false,
                message: `Streak reset: You missed ${diffWeeks - 1} week${diffWeeks - 1 > 1 ? 's' : ''} on "${actDef.name}". Your ${act.currentStreak}-week streak was reset.`
              };
              newAlerts.push(alert);
              state.alerts.unshift(alert);
              act.currentStreak = 0;
            }
          }
        }
      }
    }

    // Keep alerts capped at 50
    if (state.alerts.length > 50) {
      state.alerts = state.alerts.slice(0, 50);
    }

    return { state, newAlerts };
  }

  function unlockBadge(state, badgeId, now = new Date()) {
    if (!state.badges) state.badges = {};
    if (!state.badges[badgeId]) {
      state.badges[badgeId] = { id: badgeId, completed: false, completedAt: null, progress: 0 };
    }
    const badge = state.badges[badgeId];
    const badgeDef = getBadges().find(b => b.id === badgeId);

    if (!badge.completed) {
      badge.completed = true;
      badge.completedAt = new Date(now).toISOString();
      if (badgeDef) {
        badge.progress = badgeDef.target || 1;
      }
      return { unlocked: true, badge: badgeDef };
    }
    return { unlocked: false, badge: badgeDef };
  }

  /**
   * Toggle completion of daily or weekly activity
   */
  function toggleActivity(state, activityId, markDone = null, now = new Date()) {
    checkAndResetStreaks(state, now);

    const actDef = getActivities().find(a => a.id === activityId);
    if (!actDef) return { success: false, error: 'Activity not found' };

    let act = state.activities[activityId];
    if (!act) {
      act = {
        id: activityId,
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: null,
        previousCompletedDate: null,
        history: []
      };
      state.activities[activityId] = act;
    }

    const unlockedBadges = [];
    const isDaily = actDef.period === 'daily';
    const currentKey = isDaily ? getLocalDateKey(now) : getWeekMondayKey(now);
    const isDone = act.lastCompletedDate === currentKey;
    const shouldMarkDone = markDone !== null ? !!markDone : !isDone;

    if (shouldMarkDone && !isDone) {
      // Mark as done
      if (isDaily) {
        const diff = act.lastCompletedDate ? daysBetween(act.lastCompletedDate, currentKey) : 999;
        if (diff === 1) {
          act.currentStreak = (act.currentStreak || 0) + 1;
        } else {
          act.currentStreak = 1;
        }
      } else {
        const diffWeeks = act.lastCompletedDate ? weeksBetween(act.lastCompletedDate, currentKey) : 999;
        if (diffWeeks === 1) {
          act.currentStreak = (act.currentStreak || 0) + 1;
        } else {
          act.currentStreak = 1;
        }
      }

      act.longestStreak = Math.max(act.longestStreak || 0, act.currentStreak);
      act.previousCompletedDate = act.lastCompletedDate;
      act.lastCompletedDate = currentKey;

      if (!Array.isArray(act.history)) act.history = [];
      if (!act.history.includes(currentKey)) {
        act.history.push(currentKey);
        if (act.history.length > 120) act.history.shift();
      }

      // Check milestones
      if (actDef.milestones) {
        for (const m of actDef.milestones) {
          const target = m.days || m.weeks;
          if (act.currentStreak >= target) {
            const res = unlockBadge(state, m.badgeId, now);
            if (res.unlocked) unlockedBadges.push(res.badge);
          }
        }
      }
    } else if (!shouldMarkDone && isDone) {
      // Unmark
      act.currentStreak = Math.max(0, (act.currentStreak || 1) - 1);
      act.lastCompletedDate = act.previousCompletedDate || null;
      act.previousCompletedDate = null;
      if (Array.isArray(act.history)) {
        act.history = act.history.filter(k => k !== currentKey);
      }
    }

    return {
      success: true,
      activity: act,
      isCompleted: act.lastCompletedDate === currentKey,
      unlockedBadges
    };
  }

  /**
   * Update badge progress or completion manually
   */
  function updateBadge(state, badgeId, updates, now = new Date()) {
    if (!state.badges) state.badges = {};
    if (!state.badges[badgeId]) {
      state.badges[badgeId] = { id: badgeId, completed: false, completedAt: null, progress: 0 };
    }

    const badge = state.badges[badgeId];
    const badgeDef = getBadges().find(b => b.id === badgeId);
    let justCompleted = false;

    if (typeof updates.progress === 'number') {
      badge.progress = Math.max(0, updates.progress);
      if (badgeDef && badgeDef.target) {
        if (badge.progress >= badgeDef.target && !badge.completed) {
          badge.completed = true;
          badge.completedAt = new Date(now).toISOString();
          justCompleted = true;
        } else if (badge.progress < badgeDef.target && badge.completed) {
          badge.completed = false;
          badge.completedAt = null;
        }
      }
    }

    if (typeof updates.completed === 'boolean') {
      if (updates.completed && !badge.completed) {
        badge.completed = true;
        badge.completedAt = new Date(now).toISOString();
        if (badgeDef && badgeDef.target) {
          badge.progress = Math.max(badge.progress || 0, badgeDef.target);
        }
        justCompleted = true;
      } else if (!updates.completed && badge.completed) {
        badge.completed = false;
        badge.completedAt = null;
      }
    }

    return { badge, badgeDef, justCompleted };
  }

  /**
   * Dismiss alert by id
   */
  function dismissAlert(state, alertId) {
    if (!Array.isArray(state.alerts)) return;
    const alert = state.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.dismissed = true;
    }
  }

  /**
   * Clear all dismissed alerts
   */
  function clearDismissedAlerts(state) {
    if (!Array.isArray(state.alerts)) return;
    state.alerts = state.alerts.filter(a => !a.dismissed);
  }

  /**
   * Calculates overall status summary
   */
  function getSummary(state, now = new Date()) {
    checkAndResetStreaks(state, now);

    const todayKey = getLocalDateKey(now);
    const thisWeekMonday = getWeekMondayKey(now);
    const allBadges = getBadges();
    const allActivities = getActivities();

    let completedBadgesCount = 0;
    for (const b of allBadges) {
      if (state.badges && state.badges[b.id] && state.badges[b.id].completed) {
        completedBadgesCount++;
      }
    }

    let dailyPending = 0;
    let dailyCompleted = 0;
    let weeklyPending = 0;
    let weeklyCompleted = 0;

    for (const actDef of allActivities) {
      const act = state.activities ? state.activities[actDef.id] : null;
      if (actDef.period === 'daily') {
        const isDone = act && act.lastCompletedDate === todayKey;
        if (isDone) dailyCompleted++;
        else dailyPending++;
      } else if (actDef.period === 'weekly') {
        const isDone = act && act.lastCompletedDate === thisWeekMonday;
        if (isDone) weeklyCompleted++;
        else weeklyPending++;
      }
    }

    const activeAlerts = (state.alerts || []).filter(a => !a.dismissed);
    const totalBadges = allBadges.length || 20;

    return {
      totalBadges,
      completedBadgesCount,
      completedPercentage: Math.round((completedBadgesCount / totalBadges) * 100),
      dailyTotal: 3,
      dailyPending,
      dailyCompleted,
      weeklyTotal: 2,
      weeklyPending,
      weeklyCompleted,
      activeAlertsCount: activeAlerts.length,
      activeAlerts,
      todayKey,
      thisWeekMonday,
      nextDailyReset: getNextDailyReset(now),
      nextWeeklyReset: getNextWeeklyReset(now)
    };
  }

  return {
    getLocalDateKey,
    parseDateKey,
    daysBetween,
    getWeekMondayKey,
    weeksBetween,
    getNextDailyReset,
    getNextWeeklyReset,
    createInitialState,
    checkAndResetStreaks,
    unlockBadge,
    toggleActivity,
    updateBadge,
    dismissAlert,
    clearDismissedAlerts,
    getSummary
  };
});

