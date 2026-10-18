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

  function initFloatingWidget() {
    if (document.getElementById('aws-badge-tracker-root')) return;

    const root = document.createElement('div');
    root.id = 'aws-badge-tracker-root';

    root.innerHTML = `
      <div class="aws-tracker-drawer" id="aws-tracker-drawer">
        <div class="aws-tracker-drawer-header">
          <div class="aws-tracker-drawer-title">
            <span>🏅</span> AWS Builder Badges
          </div>
          <button class="aws-tracker-drawer-close" id="aws-tracker-close-btn">&times;</button>
        </div>
        <div class="aws-tracker-drawer-list" id="aws-tracker-drawer-items">
          <!-- Populated from storage -->
        </div>
      </div>
      <button class="aws-tracker-pill-btn" id="aws-tracker-pill">
        <span class="aws-tracker-icon">⚡</span>
        <span>Builder Badges</span>
        <span class="aws-tracker-badge-counter" id="aws-tracker-counter">...</span>
      </button>
    `;

    document.body.appendChild(root);

    const pill = document.getElementById('aws-tracker-pill');
    const drawer = document.getElementById('aws-tracker-drawer');
    const closeBtn = document.getElementById('aws-tracker-close-btn');

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

      list.innerHTML = '';
      for (const item of items) {
        const act = state.activities && state.activities[item.id];
        const isDone = act && act.lastCompletedDate === todayKey;
        const streak = (act && act.currentStreak) || 0;

        const row = document.createElement('div');
        row.className = 'aws-tracker-drawer-item';
        row.innerHTML = `
          <div>
            <span>${item.icon} ${item.label}</span>
            <div style="font-size: 10px; color: #fb923c; margin-top: 1px;">Streak: ${streak}d</div>
          </div>
          <div class="aws-tracker-drawer-check ${isDone ? 'checked' : ''}" data-item-id="${item.id}"></div>
        `;

        const checkEl = row.querySelector('.aws-tracker-drawer-check');
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

