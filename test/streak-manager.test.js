const test = require('node:test');
const assert = require('node:assert/strict');
const StreakManager = require('../common/streak-manager');
const { BADGES_DATA, RECURRING_ACTIVITIES } = require('../common/badges-data');

test('Badge and activity definitions exist and match requirements', () => {
  assert.equal(BADGES_DATA.length, 20, 'Should have exactly 20 badges');
  assert.equal(RECURRING_ACTIVITIES.length, 5, 'Should have 3 daily and 2 weekly recurring activities');

  const daily = RECURRING_ACTIVITIES.filter(a => a.period === 'daily');
  const weekly = RECURRING_ACTIVITIES.filter(a => a.period === 'weekly');
  assert.equal(daily.length, 3);
  assert.equal(weekly.length, 2);
});

test('Date calculation functions', () => {
  const d1 = new Date('2026-10-18T10:00:00Z');
  const dateKey = StreakManager.getLocalDateKey(d1);
  assert.match(dateKey, /^\d{4}-\d{2}-\d{2}$/);

  assert.equal(StreakManager.daysBetween('2026-10-18', '2026-10-19'), 1);
  assert.equal(StreakManager.daysBetween('2026-10-18', '2026-10-20'), 2);
  assert.equal(StreakManager.daysBetween('2026-10-18', '2026-10-18'), 0);

  // Monday keys
  const monday = StreakManager.getWeekMondayKey(new Date('2026-10-18T12:00:00Z')); // 2026-10-18 is a Sunday
  assert.equal(monday, '2026-10-12'); // Monday of that week
});

test('Streak incrementing on consecutive daily actions', () => {
  const state = StreakManager.createInitialState();
  const day1 = new Date('2026-10-01T10:00:00');
  const day2 = new Date('2026-10-02T10:00:00');
  const day3 = new Date('2026-10-03T10:00:00');

  // Day 1
  let res = StreakManager.toggleActivity(state, 'daily_visit', true, day1);
  assert.equal(res.success, true);
  assert.equal(state.activities.daily_visit.currentStreak, 1);
  assert.equal(state.activities.daily_visit.longestStreak, 1);

  // Day 2
  res = StreakManager.toggleActivity(state, 'daily_visit', true, day2);
  assert.equal(state.activities.daily_visit.currentStreak, 2);
  assert.equal(state.activities.daily_visit.longestStreak, 2);

  // Day 3
  res = StreakManager.toggleActivity(state, 'daily_visit', true, day3);
  assert.equal(state.activities.daily_visit.currentStreak, 3);
});

test('Missed day alerts and streak reset', () => {
  const state = StreakManager.createInitialState();
  const day1 = new Date('2026-10-01T10:00:00');
  const day2 = new Date('2026-10-02T10:00:00');
  const day4 = new Date('2026-10-04T10:00:00'); // Skipped Oct 3!

  StreakManager.toggleActivity(state, 'daily_comment', true, day1);
  StreakManager.toggleActivity(state, 'daily_comment', true, day2);
  assert.equal(state.activities.daily_comment.currentStreak, 2);

  // On Oct 4th, checking streaks detects Oct 3 was missed!
  const check = StreakManager.checkAndResetStreaks(state, day4);
  assert.equal(check.newAlerts.length, 1);
  assert.equal(state.activities.daily_comment.currentStreak, 0);
  assert.equal(state.activities.daily_comment.longestStreak, 2, 'Longest streak remains preserved');
  assert.equal(check.newAlerts[0].lostStreak, 2);
  assert.equal(check.newAlerts[0].daysMissed, 1);
  assert.match(check.newAlerts[0].message, /Streak reset/);
});

test('Milestone unlock: 7-day visit streak unlocks badge', () => {
  const state = StreakManager.createInitialState();
  let currentDate = new Date('2026-10-01T12:00:00');

  for (let i = 1; i <= 7; i++) {
    const res = StreakManager.toggleActivity(state, 'daily_visit', true, currentDate);
    if (i === 7) {
      assert.equal(res.unlockedBadges.length, 1);
      assert.equal(res.unlockedBadges[0].id, '7-day-visit-streak');
      assert.equal(state.badges['7-day-visit-streak'].completed, true);
    }
    // Next day
    currentDate = new Date(currentDate.getTime() + 86400000);
  }
  assert.equal(state.activities.daily_visit.currentStreak, 7);
});

test('Weekly streak and milestone: 4-week wish vote streak', () => {
  const state = StreakManager.createInitialState();
  let currentMonday = new Date('2026-10-05T12:00:00'); // Monday Oct 5

  for (let week = 1; week <= 4; week++) {
    const res = StreakManager.toggleActivity(state, 'weekly_wish_vote', true, currentMonday);
    if (week === 4) {
      assert.equal(res.unlockedBadges.length, 1);
      assert.equal(res.unlockedBadges[0].id, '4-week-wish-vote-streak');
      assert.equal(state.badges['4-week-wish-vote-streak'].completed, true);
    }
    currentMonday = new Date(currentMonday.getTime() + 7 * 86400000);
  }
  assert.equal(state.activities.weekly_wish_vote.currentStreak, 4);
});

test('Weekly streak missed reset', () => {
  const state = StreakManager.createInitialState();
  const week1 = new Date('2026-10-05T12:00:00'); // Oct 5 Monday
  const week2 = new Date('2026-10-12T12:00:00'); // Oct 12 Monday
  const week4 = new Date('2026-10-26T12:00:00'); // Skipped Oct 19!

  StreakManager.toggleActivity(state, 'weekly_publish_article', true, week1);
  StreakManager.toggleActivity(state, 'weekly_publish_article', true, week2);
  assert.equal(state.activities.weekly_publish_article.currentStreak, 2);

  const check = StreakManager.checkAndResetStreaks(state, week4);
  assert.equal(check.newAlerts.length, 1);
  assert.equal(state.activities.weekly_publish_article.currentStreak, 0);
  assert.equal(check.newAlerts[0].period, 'weekly');
});

test('Manual badge updates (counter and checkbox)', () => {
  const state = StreakManager.createInitialState();

  // Idea Influencer: target is 10 votes
  StreakManager.updateBadge(state, 'idea-influencer', { progress: 7 });
  assert.equal(state.badges['idea-influencer'].progress, 7);
  assert.equal(state.badges['idea-influencer'].completed, false);

  const res = StreakManager.updateBadge(state, 'idea-influencer', { progress: 10 });
  assert.equal(res.justCompleted, true);
  assert.equal(state.badges['idea-influencer'].completed, true);

  // Checkbox badge: First Wish
  StreakManager.updateBadge(state, 'first-wish', { completed: true });
  assert.equal(state.badges['first-wish'].completed, true);
});

test('Summary calculation', () => {
  const state = StreakManager.createInitialState();
  const today = new Date('2026-10-18T12:00:00');
  StreakManager.toggleActivity(state, 'daily_visit', true, today);

  const summary = StreakManager.getSummary(state, today);
  assert.equal(summary.totalBadges, 20);
  assert.equal(summary.dailyCompleted, 1);
  assert.equal(summary.dailyPending, 2);
});

