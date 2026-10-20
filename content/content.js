/**
 * Content Script for AWS Builder Center (builder.aws.com)
 */

(function () {
  'use strict';

  const browserAPI = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null);
  if (!browserAPI) return;

  // Notify background of visit to auto-increment daily visit streak if enabled
  try {
    browserAPI.runtime.sendMessage({ type: 'AUTO_RECORD_VISIT' }, (response) => {
      if (response && response.updated) {
        showToast('Visit Builder Center recorded for today! 🔥');
      }
    });
  } catch (err) {
    console.debug('Failed to send AUTO_RECORD_VISIT:', err);
  }

  // Create In-Page Quick Floating Tracker Widget
  initFloatingWidget();

  function showToast(message) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '80px';
    toast.style.right = '24px';
    toast.style.backgroundColor = '#1e293b';
    toast.style.color = '#ff9900';
    toast.style.border = '1px solid #ff9900';
    toast.style.padding = '8px 14px';
    toast.style.borderRadius = '8px';
    toast.style.fontSize = '12px';
    toast.style.fontWeight = '600';
    toast.style.zIndex = '10000000';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  function clearChildren(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function initFloatingWidget() {
    if (document.getElementById('aws-badge-tracker-root')) return;

    const root = document.createElement('div');
    root.id = 'aws-badge-tracker-root';

    // Drawer
    const drawer = document.createElement('div');
    drawer.className = 'aws-tracker-drawer';
    drawer.id = 'aws-tracker-drawer';

    const header = document.createElement('div');
    header.className = 'aws-tracker-drawer-header';

    const title = document.createElement('div');
    title.className = 'aws-tracker-drawer-title';

    const titleIcon = document.createElement('span');
    titleIcon.textContent = '🏅';
    title.appendChild(titleIcon);
    title.appendChild(document.createTextNode(' AWS Builder Badges'));
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'aws-tracker-drawer-close';
    closeBtn.id = 'aws-tracker-close-btn';
    closeBtn.textContent = '×';
    header.appendChild(closeBtn);
    drawer.appendChild(header);

    const drawerList = document.createElement('div');
    drawerList.className = 'aws-tracker-drawer-list';
    drawerList.id = 'aws-tracker-drawer-items';
    drawer.appendChild(drawerList);

    root.appendChild(drawer);

    // Pill Button
    const pill = document.createElement('button');
    pill.className = 'aws-tracker-pill-btn';
    pill.id = 'aws-tracker-pill';

    const pillIcon = document.createElement('span');
    pillIcon.className = 'aws-tracker-icon';
    pillIcon.textContent = '⚡';
    pill.appendChild(pillIcon);

    const pillText = document.createElement('span');
    pillText.textContent = 'Builder Badges';
    pill.appendChild(pillText);

    const counterSpan = document.createElement('span');
    counterSpan.className = 'aws-tracker-badge-counter';
    counterSpan.id = 'aws-tracker-counter';
    counterSpan.textContent = '...';
    pill.appendChild(counterSpan);

    root.appendChild(pill);
    document.body.appendChild(root);

    pill.addEventListener('click', () => {
      drawer.classList.toggle('open');
      if (drawer.classList.contains('open')) {
        refreshDrawerContent();
      }
    });

    closeBtn.addEventListener('click', () => {
      drawer.classList.remove('open');
    });

    // Update pill text on load
    updatePillCounter();

    // Listen for storage changes
    if (browserAPI.storage && browserAPI.storage.onChanged) {
      browserAPI.storage.onChanged.addListener(() => {
        updatePillCounter();
        if (drawer.classList.contains('open')) {
          refreshDrawerContent();
        }
      });
    }
  }

  async function updatePillCounter() {
    try {
      const data = await browserAPI.storage.local.get('aws_builder_badges_data');
      const state = data && data.aws_builder_badges_data;
      if (!state) return;

      const todayKey = getLocalDateKey();
      let dailyPending = 0;
      const dailyIds = ['daily_visit', 'daily_comment', 'daily_like'];
      for (const id of dailyIds) {
        const act = state.activities && state.activities[id];
        if (!act || act.lastCompletedDate !== todayKey) {
          dailyPending++;
        }
      }

      const counter = document.getElementById('aws-tracker-counter');
      if (counter) {
        if (dailyPending > 0) {
          counter.textContent = `${dailyPending} left`;
          counter.className = 'aws-tracker-badge-counter';
        } else {
          counter.textContent = '✓ Done';
          counter.className = 'aws-tracker-badge-counter complete';
        }
      }
    } catch (e) {
      console.debug('Error updating pill counter:', e);
    }
  }

  async function refreshDrawerContent() {
    const list = document.getElementById('aws-tracker-drawer-items');
    if (!list) return;

    try {
      const data = await browserAPI.storage.local.get('aws_builder_badges_data');
      const state = data && data.aws_builder_badges_data;
      if (!state) return;

      const todayKey = getLocalDateKey();
      const items = [
        { id: 'daily_visit', label: 'Visit Builder Center', icon: '🌐' },
        { id: 'daily_comment', label: 'Comment on Content', icon: '💬' },
        { id: 'daily_like', label: 'Like Content', icon: '👍' }
      ];

      clearChildren(list);
      for (const item of items) {
        const act = state.activities && state.activities[item.id];
        const isDone = act && act.lastCompletedDate === todayKey;
        const streak = (act && act.currentStreak) || 0;

        const row = document.createElement('div');
        row.className = 'aws-tracker-drawer-item';

        const labelDiv = document.createElement('div');

        const titleSpan = document.createElement('span');
        titleSpan.textContent = `${item.icon} ${item.label}`;
        labelDiv.appendChild(titleSpan);

        const streakDiv = document.createElement('div');
        streakDiv.style.fontSize = '10px';
        streakDiv.style.color = '#fb923c';
        streakDiv.style.marginTop = '1px';
        streakDiv.textContent = `Streak: ${streak}d`;
        labelDiv.appendChild(streakDiv);

        row.appendChild(labelDiv);

        const checkEl = document.createElement('div');
        checkEl.className = `aws-tracker-drawer-check ${isDone ? 'checked' : ''}`;
        checkEl.setAttribute('data-item-id', item.id);

        checkEl.addEventListener('click', async () => {
          // Toggle activity
          const target = !isDone;
          if (target) {
            if (!state.activities[item.id]) {
              state.activities[item.id] = { currentStreak: 1, longestStreak: 1, lastCompletedDate: todayKey };
            } else {
              state.activities[item.id].currentStreak = (state.activities[item.id].currentStreak || 0) + 1;
              state.activities[item.id].longestStreak = Math.max(state.activities[item.id].longestStreak || 0, state.activities[item.id].currentStreak);
              state.activities[item.id].lastCompletedDate = todayKey;
            }
          } else {
            if (state.activities[item.id]) {
              state.activities[item.id].currentStreak = Math.max(0, (state.activities[item.id].currentStreak || 1) - 1);
              state.activities[item.id].lastCompletedDate = null;
            }
          }

          await browserAPI.storage.local.set({ aws_builder_badges_data: state });
          browserAPI.runtime.sendMessage({ type: 'REFRESH_BADGE' });
          refreshDrawerContent();
          updatePillCounter();
        });

        row.appendChild(checkEl);
        list.appendChild(row);
      }
    } catch (e) {
      console.debug('Error refreshing drawer:', e);
    }
  }

  function getLocalDateKey() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
})();

