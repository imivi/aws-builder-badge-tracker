const test = require('node:test');
const assert = require('node:assert/strict');
const AppStorage = require('../common/storage');
const StreakManager = require('../common/streak-manager');

test('Export and import data integrity', async () => {
  const state = StreakManager.createInitialState();
  state.activities.daily_visit.currentStreak = 5;
  state.badges['first-wish'].completed = true;

  const exported = AppStorage.exportDataAsJSON(state);
  assert.ok(typeof exported === 'string');

  const importedRes = await AppStorage.importDataFromJSON(exported);
  assert.equal(importedRes.success, true);
  assert.equal(importedRes.state.activities.daily_visit.currentStreak, 5);
  assert.equal(importedRes.state.badges['first-wish'].completed, true);
});

test('Import rejects invalid JSON payload', async () => {
  const invalidRes = await AppStorage.importDataFromJSON('{"invalid": true}');
  assert.equal(invalidRes.success, false);
  assert.match(invalidRes.error, /Invalid backup file structure/);
});

