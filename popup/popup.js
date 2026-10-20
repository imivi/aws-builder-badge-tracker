/**
 * Popup Controller for AWS Builder Badges Add-on
 */

const browserAPI = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null);

function getBadges() {
  return (typeof globalThis !== 'undefined' && globalThis.BADGES_DATA) || (typeof window !== 'undefined' && window.BADGES_DATA) || [];
}

function getActivities() {
  return (typeof globalThis !== 'undefined' && globalThis.RECURRING_ACTIVITIES) || (typeof window !== 'undefined' && window.RECURRING_ACTIVITIES) || [];
}

function getStreakMgr() {
  return (typeof globalThis !== 'undefined' && globalThis.StreakManager) || (typeof window !== 'undefined' && window.StreakManager) || null;
}

function getStorage() {
  return (typeof globalThis !== 'undefined' && globalThis.AppStorage) || (typeof window !== 'undefined' && window.AppStorage) || null;
}

let appState = null;
let currentFilter = 'all';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Set up tab switching and UI listeners immediately so buttons work instantly
  setupTabs();
  setupEventListeners();
  startCountdownTimer();

  // 2. Load state and render dynamic items
  try {
    await initApp();
  } catch (err) {
    console.error('Failed to init app state:', err);
  }
});

async function initApp() {
  const storage = getStorage();
  if (storage) {
    appState = await storage.loadState();
  }
  renderAll();
}

function notifyBackground() {
  if (browserAPI && browserAPI.runtime && browserAPI.runtime.sendMessage) {
    try {
      browserAPI.runtime.sendMessage({ type: 'REFRESH_BADGE' });
    } catch {
      // Background script might be idle
    }
  }
}

async function persistState() {
  const storage = getStorage();
  if (storage && appState) {
    await storage.saveState(appState);
  }
  notifyBackground();
}

/* =========================================================
   Rendering Functions
========================================================= */

function renderAll() {
  const sm = getStreakMgr();
  if (!sm || !appState) return;

  const now = new Date();
  const summary = sm.getSummary(appState, now);

  // Overall banner
  const badgeCountEl = document.getElementById('overall-badge-count');
  const progressBarEl = document.getElementById('overall-progress-bar');
  const percentageEl = document.getElementById('overall-percentage');

  if (badgeCountEl) badgeCountEl.textContent = `${summary.completedBadgesCount} / ${summary.totalBadges}`;
  if (progressBarEl) progressBarEl.style.width = `${summary.completedPercentage}%`;
  if (percentageEl) percentageEl.textContent = `${summary.completedPercentage}%`;

  // Reward milestone banner text
  const rewardTextEl = document.getElementById('reward-milestone-text');
  if (rewardTextEl) {
    const c = summary.completedBadgesCount;
    if (c < 7) {
      rewardTextEl.textContent = `Next Reward: $10 AWS Credits (${7 - c} badge${7 - c > 1 ? 's' : ''} left to 7)`;
    } else if (c < 14) {
      rewardTextEl.textContent = `Unlocked: $10 Credits! Next: +$20 Credits (${14 - c} badge${14 - c > 1 ? 's' : ''} left to 14)`;
    } else if (c < 20) {
      rewardTextEl.textContent = `Unlocked: $30 Credits! Next: $100 Exam Voucher (${20 - c} badge${20 - c > 1 ? 's' : ''} left to 20)`;
    } else {
      rewardTextEl.textContent = `🎉 All 20 Badges Complete! Claim your $100 Exam Voucher!`;
    }
  }

  // Daily pending pill in tabs
  const dailyPill = document.getElementById('daily-pending-pill');
  if (dailyPill) {
    if (summary.dailyPending > 0) {
      dailyPill.style.display = 'inline-block';
      dailyPill.textContent = summary.dailyPending;
    } else {
      dailyPill.style.display = 'none';
    }
  }

  // Alerts pill in tabs
  const alertsPill = document.getElementById('alerts-count-pill');
  if (alertsPill) {
    if (summary.activeAlertsCount > 0) {
      alertsPill.style.display = 'inline-block';
      alertsPill.textContent = summary.activeAlertsCount;
    } else {
      alertsPill.style.display = 'none';
    }
  }

  // Global alert banner
  const globalAlertBanner = document.getElementById('global-alert-banner');
  const globalAlertText = document.getElementById('global-alert-text');
  if (globalAlertBanner && globalAlertText) {
    if (summary.activeAlertsCount > 0) {
      const latestAlert = summary.activeAlerts[0];
      globalAlertText.textContent = latestAlert.message;
      globalAlertBanner.style.display = 'flex';
      globalAlertBanner.dataset.alertId = latestAlert.id;
    } else {
      globalAlertBanner.style.display = 'none';
    }
  }

  renderChecklist(summary, now);
  renderBadges();
  renderAlerts();
  renderSettings();
}

function clearChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function renderChecklist(summary, now) {
  const dailyContainer = document.getElementById('daily-activities-list');
  const weeklyContainer = document.getElementById('weekly-activities-list');
  if (!dailyContainer || !weeklyContainer) return;

  const todayKey = summary.todayKey;
  const thisWeekMonday = summary.thisWeekMonday;
  const activities = getActivities();

  clearChildren(dailyContainer);
  clearChildren(weeklyContainer);

  for (const actDef of activities) {
    const act = (appState.activities && appState.activities[actDef.id]) || { currentStreak: 0, longestStreak: 0, lastCompletedDate: null };
    const isDaily = actDef.period === 'daily';
    const isCompleted = isDaily ? (act.lastCompletedDate === todayKey) : (act.lastCompletedDate === thisWeekMonday);

    const itemEl = document.createElement('div');
    itemEl.className = `activity-item ${isCompleted ? 'completed' : ''}`;

    const periodUnit = isDaily ? 'day' : 'week';
    const streakSuffix = act.currentStreak === 1 ? periodUnit : `${periodUnit}s`;

    // Activity Main
    const mainDiv = document.createElement('div');
    mainDiv.className = 'activity-main';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'activity-icon';
    iconSpan.textContent = actDef.icon;
    mainDiv.appendChild(iconSpan);

    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'activity-details';

    const nameRow = document.createElement('div');
    nameRow.className = 'activity-name-row';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'activity-name';
    nameSpan.textContent = actDef.name;
    nameRow.appendChild(nameSpan);

    const linkA = document.createElement('a');
    linkA.href = actDef.url;
    linkA.target = '_blank';
    linkA.rel = 'noopener noreferrer';
    linkA.className = 'activity-link';
    linkA.title = 'Open in Builder Center';
    linkA.textContent = '↗';
    nameRow.appendChild(linkA);

    detailsDiv.appendChild(nameRow);

    const subSpan = document.createElement('span');
    subSpan.className = 'activity-sub';
    subSpan.textContent = actDef.actionDesc;
    detailsDiv.appendChild(subSpan);

    const streakWrap = document.createElement('div');
    streakWrap.style.marginTop = '3px';

    const streakTag = document.createElement('span');
    streakTag.className = 'activity-streak-tag';
    streakTag.textContent = `🔥 ${act.currentStreak} ${streakSuffix} streak`;

    if (act.longestStreak > act.currentStreak) {
      const bestSpan = document.createElement('span');
      bestSpan.style.opacity = '0.75';
      bestSpan.style.fontSize = '10px';
      bestSpan.textContent = ` (Best: ${act.longestStreak})`;
      streakTag.appendChild(bestSpan);
    }
    streakWrap.appendChild(streakTag);
    detailsDiv.appendChild(streakWrap);

    mainDiv.appendChild(detailsDiv);
    itemEl.appendChild(mainDiv);

    // Check Toggle
    const toggleDiv = document.createElement('div');
    toggleDiv.className = 'activity-check-toggle';

    const checkbox = document.createElement('div');
    checkbox.className = `custom-checkbox ${isCompleted ? 'checked' : ''}`;
    checkbox.setAttribute('data-act-id', actDef.id);
    checkbox.title = isCompleted ? 'Mark uncompleted' : 'Mark done';

    checkbox.addEventListener('click', async (e) => {
      e.stopPropagation();
      await handleToggleActivity(actDef.id);
    });

    toggleDiv.appendChild(checkbox);
    itemEl.appendChild(toggleDiv);

    if (isDaily) {
      dailyContainer.appendChild(itemEl);
    } else {
      weeklyContainer.appendChild(itemEl);
    }
  }
}

async function handleToggleActivity(activityId) {
  const sm = getStreakMgr();
  if (!sm || !appState) return;

  const res = sm.toggleActivity(appState, activityId, null, new Date());
  await persistState();

  if (res.unlockedBadges && res.unlockedBadges.length > 0) {
    for (const b of res.unlockedBadges) {
      if (browserAPI && browserAPI.runtime && browserAPI.runtime.sendMessage) {
        browserAPI.runtime.sendMessage({
          type: 'NOTIFY_BADGE_UNLOCKED',
          badge: b
        });
      }
    }
  }

  renderAll();
}

function renderBadges() {
  const grid = document.getElementById('badges-grid');
  if (!grid || !appState) return;

  const allBadges = getBadges();
  const completedCount = allBadges.filter(b => appState.badges && appState.badges[b.id] && appState.badges[b.id].completed).length;
  const incompleteCount = allBadges.length - completedCount;

  const compCountEl = document.getElementById('filter-completed-count');
  const incompCountEl = document.getElementById('filter-incomplete-count');
  if (compCountEl) compCountEl.textContent = completedCount;
  if (incompCountEl) incompCountEl.textContent = incompleteCount;

  const filtered = allBadges.filter(badge => {
    const isCompleted = !!(appState.badges && appState.badges[badge.id] && appState.badges[badge.id].completed);

    if (currentFilter === 'completed' && !isCompleted) return false;
    if (currentFilter === 'incomplete' && isCompleted) return false;
    if (currentFilter === 'streaks' && badge.type !== 'streak') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = badge.name.toLowerCase().includes(q);
      const matchGoal = badge.goal.toLowerCase().includes(q);
      if (!matchName && !matchGoal) return false;
    }

    return true;
  });

  clearChildren(grid);
  if (filtered.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';

    const emptyIcon = document.createElement('span');
    emptyIcon.className = 'empty-icon';
    emptyIcon.textContent = '🔍';
    emptyState.appendChild(emptyIcon);

    const emptyText = document.createElement('p');
    emptyText.textContent = 'No badges match your filter or search query.';
    emptyState.appendChild(emptyText);

    grid.appendChild(emptyState);
    return;
  }

  for (const badge of filtered) {
    const badgeState = (appState.badges && appState.badges[badge.id]) || { completed: false, progress: 0, completedAt: null };
    const card = document.createElement('div');
    card.className = `badge-card ${badgeState.completed ? 'unlocked' : ''}`;

    const currentVal = badgeState.progress || 0;

    // Badge Left
    const badgeLeft = document.createElement('div');
    badgeLeft.className = 'badge-left';

    const iconBox = document.createElement('div');
    iconBox.className = 'badge-icon-box';
    iconBox.textContent = badge.icon;
    badgeLeft.appendChild(iconBox);

    const badgeInfo = document.createElement('div');
    badgeInfo.className = 'badge-info';

    const nameRow = document.createElement('div');
    nameRow.className = 'badge-name-row';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'badge-name';
    nameSpan.textContent = badge.name;
    nameRow.appendChild(nameSpan);

    if (badgeState.completed) {
      const statusPill = document.createElement('span');
      statusPill.className = 'badge-status-pill unlocked';
      statusPill.textContent = 'Completed ✓';
      nameRow.appendChild(statusPill);
    } else if (badge.type === 'streak') {
      const statusPill = document.createElement('span');
      statusPill.className = 'badge-status-pill streak';
      statusPill.textContent = 'Streak';
      nameRow.appendChild(statusPill);
    }

    badgeInfo.appendChild(nameRow);

    const goalDiv = document.createElement('div');
    goalDiv.className = 'badge-goal';
    goalDiv.textContent = badge.goal;
    badgeInfo.appendChild(goalDiv);

    badgeLeft.appendChild(badgeInfo);
    card.appendChild(badgeLeft);

    // Badge Right Controls
    const badgeRight = document.createElement('div');
    badgeRight.className = 'badge-right-ctrl';

    if (badge.type === 'counter') {
      const ctrlWrap = document.createElement('div');
      ctrlWrap.className = 'counter-ctrl-wrap';

      const decBtn = document.createElement('button');
      decBtn.className = 'counter-btn dec-btn';
      decBtn.setAttribute('data-badge-id', badge.id);
      decBtn.textContent = '-';
      decBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleBadgeCounterChange(badge.id, -1);
      });
      ctrlWrap.appendChild(decBtn);

      const valSpan = document.createElement('span');
      valSpan.className = 'counter-val';
      valSpan.textContent = `${currentVal} / ${badge.target}`;
      ctrlWrap.appendChild(valSpan);

      const incBtn = document.createElement('button');
      incBtn.className = 'counter-btn inc-btn';
      incBtn.setAttribute('data-badge-id', badge.id);
      incBtn.textContent = '+';
      incBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleBadgeCounterChange(badge.id, 1);
      });
      ctrlWrap.appendChild(incBtn);
      badgeRight.appendChild(ctrlWrap);

      const progMini = document.createElement('div');
      progMini.className = 'badge-progress-mini';

      const progMiniFill = document.createElement('div');
      progMiniFill.className = 'badge-progress-mini-fill';
      progMiniFill.style.width = `${Math.min(100, Math.round((currentVal / badge.target) * 100))}%`;
      progMini.appendChild(progMiniFill);

      badgeRight.appendChild(progMini);
    } else if (badge.type === 'streak') {
      const act = (appState.activities && appState.activities[badge.activityId]) || { currentStreak: 0 };
      const currentStreak = act.currentStreak || 0;
      const pct = Math.min(100, Math.round((currentStreak / badge.target) * 100));

      const streakCtrlWrap = document.createElement('div');
      streakCtrlWrap.style.display = 'flex';
      streakCtrlWrap.style.alignItems = 'center';
      streakCtrlWrap.style.gap = '8px';

      const progressCol = document.createElement('div');
      progressCol.style.textAlign = 'right';

      const streakText = document.createElement('div');
      streakText.style.fontSize = '11px';
      streakText.style.fontWeight = '700';
      streakText.style.color = badgeState.completed ? 'var(--success)' : 'var(--aws-orange)';
      streakText.textContent = `${currentStreak} / ${badge.target} ${badge.unit}`;
      progressCol.appendChild(streakText);

      const progMini = document.createElement('div');
      progMini.className = 'badge-progress-mini';
      progMini.style.marginTop = '2px';

      const progMiniFill = document.createElement('div');
      progMiniFill.className = 'badge-progress-mini-fill';
      progMiniFill.style.width = `${pct}%`;
      progMiniFill.style.backgroundColor = badgeState.completed ? 'var(--success)' : 'var(--aws-orange)';
      progMini.appendChild(progMiniFill);
      progressCol.appendChild(progMini);

      streakCtrlWrap.appendChild(progressCol);

      const checkbox = document.createElement('div');
      checkbox.className = `custom-checkbox ${badgeState.completed ? 'checked' : ''}`;
      checkbox.setAttribute('data-badge-checkbox', badge.id);
      checkbox.title = 'Manually toggle badge completion';
      checkbox.addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleBadgeCheckboxToggle(badge.id);
      });
      streakCtrlWrap.appendChild(checkbox);

      badgeRight.appendChild(streakCtrlWrap);
    } else {
      const checkbox = document.createElement('div');
      checkbox.className = `custom-checkbox ${badgeState.completed ? 'checked' : ''}`;
      checkbox.setAttribute('data-badge-checkbox', badge.id);
      checkbox.title = badgeState.completed ? 'Mark incomplete' : 'Mark complete';
      checkbox.addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleBadgeCheckboxToggle(badge.id);
      });
      badgeRight.appendChild(checkbox);
    }

    card.appendChild(badgeRight);
    grid.appendChild(card);
  }
}

async function handleBadgeCounterChange(badgeId, delta) {
  const sm = getStreakMgr();
  if (!sm || !appState) return;

  const bState = (appState.badges && appState.badges[badgeId]) || { progress: 0 };
  const newProgress = Math.max(0, (bState.progress || 0) + delta);
  sm.updateBadge(appState, badgeId, { progress: newProgress }, new Date());
  await persistState();
  renderAll();
}

async function handleBadgeCheckboxToggle(badgeId) {
  const sm = getStreakMgr();
  if (!sm || !appState) return;

  const bState = (appState.badges && appState.badges[badgeId]) || { completed: false };
  const targetCompleted = !bState.completed;
  sm.updateBadge(appState, badgeId, { completed: targetCompleted }, new Date());
  await persistState();
  renderAll();
}

function renderAlerts() {
  const container = document.getElementById('alerts-full-list');
  if (!container || !appState) return;

  const alerts = appState.alerts || [];

  clearChildren(container);

  if (alerts.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';

    const emptyIcon = document.createElement('span');
    emptyIcon.className = 'empty-icon';
    emptyIcon.textContent = '🎉';
    emptyState.appendChild(emptyIcon);

    const emptyText = document.createElement('p');
    emptyText.textContent = 'No missed streaks! Keep up the daily builder momentum!';
    emptyState.appendChild(emptyText);

    container.appendChild(emptyState);
    return;
  }

  for (const alert of alerts) {
    const card = document.createElement('div');
    card.className = `alert-item-card ${alert.dismissed ? 'dismissed' : ''}`;

    const dateStr = alert.detectedAt ? new Date(alert.detectedAt).toLocaleDateString() : '';

    const textDiv = document.createElement('div');
    textDiv.style.flex = '1';

    const msgDiv = document.createElement('div');
    msgDiv.className = 'alert-item-msg';
    msgDiv.textContent = alert.message;
    textDiv.appendChild(msgDiv);

    const timeDiv = document.createElement('div');
    timeDiv.className = 'alert-item-time';
    timeDiv.textContent = `Detected: ${dateStr}${alert.dismissed ? ' • (Dismissed)' : ''}`;
    textDiv.appendChild(timeDiv);

    card.appendChild(textDiv);

    if (!alert.dismissed) {
      const dismissBtn = document.createElement('button');
      dismissBtn.className = 'action-btn-sm dismiss-item-btn';
      dismissBtn.setAttribute('data-alert-id', alert.id);
      dismissBtn.textContent = 'Dismiss';

      dismissBtn.addEventListener('click', async () => {
        const sm = getStreakMgr();
        if (sm) sm.dismissAlert(appState, alert.id);
        await persistState();
        renderAll();
      });

      card.appendChild(dismissBtn);
    }

    container.appendChild(card);
  }
}

function renderSettings() {
  const notifToggle = document.getElementById('setting-notifications-toggle');
  const autoVisitToggle = document.getElementById('setting-auto-visit-toggle');

  if (appState && appState.settings) {
    if (notifToggle) notifToggle.checked = appState.settings.notificationsEnabled !== false;
    if (autoVisitToggle) autoVisitToggle.checked = appState.settings.autoVisitDetection !== false;
  }

  // Render Manual Streaks Adjustment list
  const manualList = document.getElementById('manual-streaks-list');
  if (!manualList || !appState) return;

  const activities = getActivities();
  clearChildren(manualList);

  for (const actDef of activities) {
    const act = (appState.activities && appState.activities[actDef.id]) || { currentStreak: 0, longestStreak: 0 };
    const unit = actDef.period === 'daily' ? 'days' : 'weeks';

    const row = document.createElement('div');
    row.className = 'manual-streak-row';

    // Info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'manual-streak-info';

    const iconSpan = document.createElement('span');
    iconSpan.textContent = actDef.icon;
    infoDiv.appendChild(iconSpan);

    const nameCol = document.createElement('div');

    const nameDiv = document.createElement('div');
    nameDiv.className = 'manual-streak-name';
    nameDiv.textContent = actDef.name;
    nameCol.appendChild(nameDiv);

    const bestDiv = document.createElement('div');
    bestDiv.style.fontSize = '10px';
    bestDiv.style.color = 'var(--text-muted)';
    bestDiv.textContent = `Best: ${act.longestStreak || act.currentStreak} ${unit}`;
    nameCol.appendChild(bestDiv);

    infoDiv.appendChild(nameCol);
    row.appendChild(infoDiv);

    // Controls
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'manual-streak-controls';

    const ctrlWrap = document.createElement('div');
    ctrlWrap.className = 'counter-ctrl-wrap';

    const decBtn = document.createElement('button');
    decBtn.className = 'counter-btn dec-streak-btn';
    decBtn.setAttribute('data-act-id', actDef.id);
    decBtn.textContent = '-';

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.className = 'manual-streak-input';
    input.setAttribute('data-act-id', actDef.id);
    input.value = String(act.currentStreak || 0);

    const incBtn = document.createElement('button');
    incBtn.className = 'counter-btn inc-streak-btn';
    incBtn.setAttribute('data-act-id', actDef.id);
    incBtn.textContent = '+';

    decBtn.addEventListener('click', async () => {
      const current = parseInt(input.value, 10) || 0;
      const next = Math.max(0, current - 1);
      await handleManualStreakChange(actDef.id, next);
    });

    incBtn.addEventListener('click', async () => {
      const current = parseInt(input.value, 10) || 0;
      await handleManualStreakChange(actDef.id, current + 1);
    });

    input.addEventListener('change', async () => {
      const next = Math.max(0, parseInt(input.value, 10) || 0);
      await handleManualStreakChange(actDef.id, next);
    });

    ctrlWrap.appendChild(decBtn);
    ctrlWrap.appendChild(input);
    ctrlWrap.appendChild(incBtn);
    controlsDiv.appendChild(ctrlWrap);

    const unitSpan = document.createElement('span');
    unitSpan.className = 'manual-streak-unit';
    unitSpan.textContent = unit;
    controlsDiv.appendChild(unitSpan);

    row.appendChild(controlsDiv);
    manualList.appendChild(row);
  }
}

async function handleManualStreakChange(activityId, newStreak) {
  const sm = getStreakMgr();
  if (!sm || !appState) return;

  const res = sm.setActivityStreak(appState, activityId, newStreak, null, new Date());
  await persistState();

  if (res.unlockedBadges && res.unlockedBadges.length > 0) {
    for (const b of res.unlockedBadges) {
      if (browserAPI && browserAPI.runtime && browserAPI.runtime.sendMessage) {
        browserAPI.runtime.sendMessage({
          type: 'NOTIFY_BADGE_UNLOCKED',
          badge: b
        });
      }
    }
  }

  renderAll();
}

/* =========================================================
   Event Listeners & Tabs
========================================================= */

function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const panes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tabTarget = btn.getAttribute('data-tab');
      if (!tabTarget) return;

      tabBtns.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(tabTarget);
      if (targetPane) {
        targetPane.classList.add('active');
      }
    });
  });
}

function setupEventListeners() {
  // Dismiss global alert banner
  const dismissGlobal = document.getElementById('dismiss-global-alert-btn');
  if (dismissGlobal) {
    dismissGlobal.addEventListener('click', async () => {
      const banner = document.getElementById('global-alert-banner');
      const alertId = banner ? banner.dataset.alertId : null;
      if (alertId && appState) {
        const sm = getStreakMgr();
        if (sm) sm.dismissAlert(appState, alertId);
        await persistState();
        renderAll();
      }
    });
  }

  // Complete all daily activities button
  const completeAllBtn = document.getElementById('complete-all-daily-btn');
  if (completeAllBtn) {
    completeAllBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const sm = getStreakMgr();
      const storage = getStorage();
      if (!sm || !storage) return;

      if (!appState) {
        appState = await storage.loadState();
      }

      const now = new Date();
      const activities = getActivities();
      for (const act of activities) {
        if (act.period === 'daily') {
          sm.toggleActivity(appState, act.id, true, now);
        }
      }
      await persistState();
      renderAll();
    });
  }

  // Clear dismissed alerts
  const clearAlertsBtn = document.getElementById('clear-all-alerts-btn');
  if (clearAlertsBtn) {
    clearAlertsBtn.addEventListener('click', async () => {
      const sm = getStreakMgr();
      if (sm && appState) {
        sm.clearDismissedAlerts(appState);
        await persistState();
        renderAll();
      }
    });
  }

  // Filter pills
  const filterPills = document.querySelectorAll('.filter-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.dataset.filter;
      renderBadges();
    });
  });

  // Search input
  const searchInput = document.getElementById('badge-search-input');
  const clearSearchBtn = document.getElementById('badge-search-clear');
  if (searchInput && clearSearchBtn) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
      renderBadges();
    });
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      renderBadges();
    });
  }

  // Settings toggles
  const notifToggle = document.getElementById('setting-notifications-toggle');
  if (notifToggle) {
    notifToggle.addEventListener('change', async (e) => {
      if (!appState) return;
      if (!appState.settings) appState.settings = {};
      appState.settings.notificationsEnabled = e.target.checked;
      await persistState();
    });
  }

  const autoVisitToggle = document.getElementById('setting-auto-visit-toggle');
  if (autoVisitToggle) {
    autoVisitToggle.addEventListener('change', async (e) => {
      if (!appState) return;
      if (!appState.settings) appState.settings = {};
      appState.settings.autoVisitDetection = e.target.checked;
      await persistState();
    });
  }

  // Export JSON
  const exportBtn = document.getElementById('export-json-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const storage = getStorage();
      const sm = getStreakMgr();
      if (!storage || !sm || !appState) return;

      const jsonStr = storage.exportDataAsJSON(appState);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = sm.getLocalDateKey(new Date());

      const a = document.createElement('a');
      a.href = url;
      a.download = `aws-builder-badges-backup-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Import JSON
  const importInput = document.getElementById('import-json-input');
  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const storage = getStorage();
      if (!storage) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
        const res = await storage.importDataFromJSON(evt.target.result);
        if (res.success) {
          appState = res.state;
          notifyBackground();
          renderAll();
          alert('Data imported successfully!');
        } else {
          alert('Failed to import file: ' + res.error);
        }
        importInput.value = '';
      };
      reader.readAsText(file);
    });
  }

  // Reset all data
  const resetBtn = document.getElementById('reset-all-data-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset all tracked badge progress, streaks, and history? This cannot be undone.')) {
        const storage = getStorage();
        if (storage) {
          appState = await storage.resetAllData();
          notifyBackground();
          renderAll();
        }
      }
    });
  }
}

function startCountdownTimer() {
  function updateTime() {
    const sm = getStreakMgr();
    if (!sm) return;

    const now = new Date();
    const nextDaily = sm.getNextDailyReset(now);
    const diffMs = nextDaily - now.getTime();

    if (diffMs > 0) {
      const hours = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      const countdownEl = document.getElementById('daily-reset-countdown');
      if (countdownEl) {
        countdownEl.textContent = `Resets in ${hours}h ${mins}m`;
      }
    }
  }

  updateTime();
  setInterval(updateTime, 60000);
}
