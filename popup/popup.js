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

function renderChecklist(summary, now) {
  const dailyContainer = document.getElementById('daily-activities-list');
  const weeklyContainer = document.getElementById('weekly-activities-list');
  if (!dailyContainer || !weeklyContainer) return;

  const todayKey = summary.todayKey;
  const thisWeekMonday = summary.thisWeekMonday;
  const activities = getActivities();

  dailyContainer.innerHTML = '';
  weeklyContainer.innerHTML = '';

  for (const actDef of activities) {
    const act = (appState.activities && appState.activities[actDef.id]) || { currentStreak: 0, longestStreak: 0, lastCompletedDate: null };
    const isDaily = actDef.period === 'daily';
    const isCompleted = isDaily ? (act.lastCompletedDate === todayKey) : (act.lastCompletedDate === thisWeekMonday);

    const itemEl = document.createElement('div');
    itemEl.className = `activity-item ${isCompleted ? 'completed' : ''}`;

    const periodUnit = isDaily ? 'day' : 'week';
    const streakSuffix = act.currentStreak === 1 ? periodUnit : `${periodUnit}s`;

    itemEl.innerHTML = `
      <div class="activity-main">
        <span class="activity-icon">${actDef.icon}</span>
        <div class="activity-details">
          <div class="activity-name-row">
            <span class="activity-name">${actDef.name}</span>
            <a href="${actDef.url}" target="_blank" rel="noopener noreferrer" class="activity-link" title="Open in Builder Center">↗</a>
          </div>
          <span class="activity-sub">${actDef.actionDesc}</span>
          <div style="margin-top: 3px;">
            <span class="activity-streak-tag">
              🔥 ${act.currentStreak} ${streakSuffix} streak
              ${act.longestStreak > act.currentStreak ? `<span style="opacity:0.75; font-size:10px;">(Best: ${act.longestStreak})</span>` : ''}
            </span>
          </div>
        </div>
      </div>
      <div class="activity-check-toggle">
        <div class="custom-checkbox ${isCompleted ? 'checked' : ''}" data-act-id="${actDef.id}" title="${isCompleted ? 'Mark uncompleted' : 'Mark done'}"></div>
      </div>
    `;

    const checkbox = itemEl.querySelector('.custom-checkbox');
    if (checkbox) {
      checkbox.addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleToggleActivity(actDef.id);
      });
    }

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

  grid.innerHTML = '';
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <p>No badges match your filter or search query.</p>
      </div>
    `;
    return;
  }

  for (const badge of filtered) {
    const badgeState = (appState.badges && appState.badges[badge.id]) || { completed: false, progress: 0, completedAt: null };
    const card = document.createElement('div');
    card.className = `badge-card ${badgeState.completed ? 'unlocked' : ''}`;

    let controlHtml = '';
    const currentVal = badgeState.progress || 0;

    if (badge.type === 'counter') {
      controlHtml = `
        <div class="counter-ctrl-wrap">
          <button class="counter-btn dec-btn" data-badge-id="${badge.id}">-</button>
          <span class="counter-val">${currentVal} / ${badge.target}</span>
          <button class="counter-btn inc-btn" data-badge-id="${badge.id}">+</button>
        </div>
        <div class="badge-progress-mini">
          <div class="badge-progress-mini-fill" style="width: ${Math.min(100, Math.round((currentVal / badge.target) * 100))}%"></div>
        </div>
      `;
    } else if (badge.type === 'streak') {
      const act = (appState.activities && appState.activities[badge.activityId]) || { currentStreak: 0 };
      const currentStreak = act.currentStreak || 0;
      const pct = Math.min(100, Math.round((currentStreak / badge.target) * 100));

      controlHtml = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="text-align: right;">
            <div style="font-size: 11px; font-weight: 700; color: ${badgeState.completed ? 'var(--success)' : 'var(--aws-orange)'};">
              ${currentStreak} / ${badge.target} ${badge.unit}
            </div>
            <div class="badge-progress-mini" style="margin-top: 2px;">
              <div class="badge-progress-mini-fill" style="width: ${pct}%; background-color: ${badgeState.completed ? 'var(--success)' : 'var(--aws-orange)'};"></div>
            </div>
          </div>
          <div class="custom-checkbox ${badgeState.completed ? 'checked' : ''}" data-badge-checkbox="${badge.id}" title="Manually toggle badge completion"></div>
        </div>
      `;
    } else {
      controlHtml = `
        <div class="custom-checkbox ${badgeState.completed ? 'checked' : ''}" data-badge-checkbox="${badge.id}" title="${badgeState.completed ? 'Mark incomplete' : 'Mark complete'}"></div>
      `;
    }

    card.innerHTML = `
      <div class="badge-left">
        <div class="badge-icon-box">${badge.icon}</div>
        <div class="badge-info">
          <div class="badge-name-row">
            <span class="badge-name">${badge.name}</span>
            ${badgeState.completed 
              ? `<span class="badge-status-pill unlocked">Completed ✓</span>` 
              : (badge.type === 'streak' ? `<span class="badge-status-pill streak">Streak</span>` : '')
            }
          </div>
          <div class="badge-goal">${badge.goal}</div>
        </div>
      </div>
      <div class="badge-right-ctrl">
        ${controlHtml}
      </div>
    `;

    const decBtn = card.querySelector('.dec-btn');
    const incBtn = card.querySelector('.inc-btn');
    const checkbox = card.querySelector('[data-badge-checkbox]');

    if (decBtn && incBtn) {
      decBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleBadgeCounterChange(badge.id, -1);
      });
      incBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleBadgeCounterChange(badge.id, 1);
      });
    }

    if (checkbox) {
      checkbox.addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleBadgeCheckboxToggle(badge.id);
      });
    }

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

  if (alerts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🎉</span>
        <p>No missed streaks! Keep up the daily builder momentum!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  for (const alert of alerts) {
    const card = document.createElement('div');
    card.className = `alert-item-card ${alert.dismissed ? 'dismissed' : ''}`;

    const dateStr = alert.detectedAt ? new Date(alert.detectedAt).toLocaleDateString() : '';

    card.innerHTML = `
      <div style="flex: 1;">
        <div class="alert-item-msg">${alert.message}</div>
        <div class="alert-item-time">Detected: ${dateStr} ${alert.dismissed ? '• (Dismissed)' : ''}</div>
      </div>
      ${!alert.dismissed ? `<button class="action-btn-sm dismiss-item-btn" data-alert-id="${alert.id}">Dismiss</button>` : ''}
    `;

    const dismissBtn = card.querySelector('.dismiss-item-btn');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', async () => {
        const sm = getStreakMgr();
        if (sm) sm.dismissAlert(appState, alert.id);
        await persistState();
        renderAll();
      });
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
  manualList.innerHTML = '';

  for (const actDef of activities) {
    const act = (appState.activities && appState.activities[actDef.id]) || { currentStreak: 0, longestStreak: 0 };
    const unit = actDef.period === 'daily' ? 'days' : 'weeks';

    const row = document.createElement('div');
    row.className = 'manual-streak-row';
    row.innerHTML = `
      <div class="manual-streak-info">
        <span>${actDef.icon}</span>
        <div>
          <div class="manual-streak-name">${actDef.name}</div>
          <div style="font-size: 10px; color: var(--text-muted);">Best: ${act.longestStreak || act.currentStreak} ${unit}</div>
        </div>
      </div>
      <div class="manual-streak-controls">
        <div class="counter-ctrl-wrap">
          <button class="counter-btn dec-streak-btn" data-act-id="${actDef.id}">-</button>
          <input type="number" min="0" class="manual-streak-input" data-act-id="${actDef.id}" value="${act.currentStreak || 0}">
          <button class="counter-btn inc-streak-btn" data-act-id="${actDef.id}">+</button>
        </div>
        <span class="manual-streak-unit">${unit}</span>
      </div>
    `;

    const decBtn = row.querySelector('.dec-streak-btn');
    const incBtn = row.querySelector('.inc-streak-btn');
    const input = row.querySelector('.manual-streak-input');

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
