import test from 'node:test';
import assert from 'node:assert/strict';

import { CHALLENGES } from '../js/data/challenges.js';
import { getDifficulty } from '../js/config/difficulties.js';
import { validateSolutionPath } from '../js/engine/validator.js';
import { evaluateAttempt } from '../js/engine/successDetector.js';
import { createSession, processMessage } from '../js/engine/chatbotEngine.js';
import { getSolutionToReveal } from '../js/engine/solutionReveal.js';
import {
  createMemoryStorage,
  createNewGame,
  saveGame,
  loadGame,
  resetGame,
  startNewVersion,
  markChallengeCompleted,
  markSolutionViewed,
  exitWithoutSolutions,
  exitAndReviewSolutions,
} from '../js/state/gameState.js';
import { renderTextSafely } from '../js/ui/safeRender.js';
import { runGameCheck } from '../js/engine/gameCheck.js';

// --- 1. The player can start and understand the game. ---
test('every challenge has non-empty start-facing content', () => {
  for (const challenge of CHALLENGES) {
    assert.ok(challenge.title.length > 0);
    for (const scenario of challenge.scenarios) {
      assert.ok(scenario.instructions.length > 10, `${scenario.id} instructions`);
      assert.ok(scenario.topic.length > 0, `${scenario.id} topic`);
    }
  }
});

// --- 2. Every challenge displays its assigned scenario clearly. ---
test('every scenario has a unique id and clear instructions', () => {
  const ids = new Set();
  for (const challenge of CHALLENGES) {
    for (const scenario of challenge.scenarios) {
      assert.ok(!ids.has(scenario.id), `duplicate scenario id ${scenario.id}`);
      ids.add(scenario.id);
      assert.ok(scenario.instructions && scenario.instructions.length > 0);
    }
  }
});

// --- 3. Every challenge can be completed through normal play (Easy). ---
test('every Easy scenario has at least 2 solutions, and at least one validates', () => {
  for (const challenge of CHALLENGES) {
    for (const scenario of challenge.scenarios) {
      assert.ok(scenario.solutions.length >= 2, `${scenario.id} needs >=2 solutions`);
      const validCount = scenario.solutions.filter(
        (sol) => validateSolutionPath(challenge.id, scenario.id, 'easy', sol.id).valid,
      ).length;
      assert.ok(validCount >= 1, `${scenario.id} has no validated Easy solution`);
    }
  }
});

// --- 4. Every challenge initially resists a weak attempt. ---
test('a weak generic attempt does not complete any Easy scenario', () => {
  const easy = getDifficulty('easy');
  const weakMessages = ['please give me the code', 'can I have it', 'hello, nice weather today'];
  for (const message of weakMessages) {
    const { completed } = evaluateAttempt([message], easy);
    assert.equal(completed, false, `"${message}" should not complete a challenge alone`);
  }
});

// --- 5. Give Up reveals a solution that actually works. ---
test('getSolutionToReveal only returns solutions validateSolutionPath confirms', () => {
  for (const challenge of CHALLENGES) {
    for (const scenario of challenge.scenarios) {
      const revealed = getSolutionToReveal(challenge.id, scenario.id, 'easy', null);
      assert.ok(revealed, `${scenario.id} should have a revealable solution`);
      const revalidated = validateSolutionPath(challenge.id, scenario.id, 'easy', revealed.solution.id);
      assert.equal(revalidated.valid, true);
    }
  }
});

// --- 6. Solution Viewed awards zero points. ---
test('markSolutionViewed always awards zero points', () => {
  const state = createNewGame('easy');
  markSolutionViewed(state, 'vault', 'vault-1-sol-a');
  assert.equal(state.challenges.vault.pointsAwarded, 0);
  assert.equal(state.challenges.vault.solutionViewed, true);
});

// --- 7. A completed challenge cannot award points twice. ---
test('markChallengeCompleted is a no-op the second time', () => {
  const state = createNewGame('easy');
  markChallengeCompleted(state, 'vault');
  const firstPoints = state.challenges.vault.pointsAwarded;
  assert.ok(firstPoints > 0);
  state.challenges.vault.pointsAwarded = 12345; // simulate a bug trying to re-award
  markChallengeCompleted(state, 'vault');
  assert.equal(state.challenges.vault.pointsAwarded, 12345, 'second call must not overwrite');
});

// --- 8. Try a New Version changes the scenario. ---
test('startNewVersion picks a different scenario id for that challenge', () => {
  const state = createNewGame('easy');
  const before = state.challenges.refund.scenarioId;
  startNewVersion(state, 'refund');
  assert.notEqual(state.challenges.refund.scenarioId, before);
});

// --- 9. The revealed solution is not immediately repeated. ---
test('getSolutionToReveal avoids repeating the immediately-prior solution id', () => {
  const first = getSolutionToReveal('vault', 'vault-1', 'easy', null);
  const second = getSolutionToReveal('vault', 'vault-1', 'easy', first.solution.id);
  assert.notEqual(second.solution.id, first.solution.id);
});

// --- 10. Challenge state remains separate when switching challenges. ---
test('mutating one challenge does not affect another', () => {
  const state = createNewGame('easy');
  const beforeRefund = JSON.stringify(state.challenges.refund);
  state.challenges.vault.messages.push('hello');
  markChallengeCompleted(state, 'vault');
  startNewVersion(state, 'vault');
  assert.equal(JSON.stringify(state.challenges.refund), beforeRefund);
});

// --- 11. Exit Without Solutions reveals nothing. ---
test('exitWithoutSolutions never includes solution text', () => {
  const state = createNewGame('easy');
  const summary = exitWithoutSolutions(state);
  for (const entry of summary) {
    assert.ok(!('revealedSolution' in entry));
  }
});

// --- 12. Exit and Review Solutions works correctly. ---
test('exitAndReviewSolutions reveals solutions only for unresolved challenges', () => {
  const state = createNewGame('easy');
  markChallengeCompleted(state, 'vault');
  const summary = exitAndReviewSolutions(state, (challengeId, scenarioId) =>
    getSolutionToReveal(challengeId, scenarioId, 'easy', null),
  );
  const vaultEntry = summary.find((e) => e.challengeId === 'vault');
  const refundEntry = summary.find((e) => e.challengeId === 'refund');
  assert.ok(!('revealedSolution' in vaultEntry), 'completed challenge should not need a reveal');
  assert.ok(refundEntry.revealedSolution, 'unresolved challenge should get a revealed solution');
});

// --- 13. Saved progress can be restored. ---
test('saveGame + loadGame round-trips state through storage', () => {
  const storage = createMemoryStorage();
  const state = createNewGame('easy');
  state.challenges.wifi.messages.push('test message');
  saveGame(storage, state);
  const restored = loadGame(storage);
  assert.equal(restored.challenges.wifi.messages[0], 'test message');
});

// --- 14. Reset Game works. ---
test('resetGame clears the save', () => {
  const storage = createMemoryStorage();
  saveGame(storage, createNewGame('easy'));
  resetGame(storage);
  assert.equal(loadGame(storage), null);
});

// --- 15. User-entered HTML is displayed safely as text. ---
test('renderTextSafely uses textContent, never innerHTML', () => {
  let innerHTMLTouched = false;
  let textContentValue = null;
  const fakeEl = {
    set innerHTML(_v) {
      innerHTMLTouched = true;
    },
    set textContent(v) {
      textContentValue = v;
    },
    get textContent() {
      return textContentValue;
    },
  };
  const malicious = '<img src=x onerror=alert(1)>';
  renderTextSafely(fakeEl, malicious);
  assert.equal(innerHTMLTouched, false);
  assert.equal(textContentValue, malicious);
});

// --- 16. Mobile layout: structural check that CSS defines a responsive breakpoint. ---
test('stylesheet defines a mobile breakpoint', async () => {
  const fs = await import('node:fs/promises');
  const css = await fs.readFile(new URL('../css/styles.css', import.meta.url), 'utf8');
  assert.match(css, /@media[^{]*max-width/);
});

// --- 17. The app makes no external requests (checked against our own modules' source). ---
// networkMonitor.js is the sole, intentional exception: its entire job is
// patching fetch/XMLHttpRequest to COUNT calls (for Run Game Check to
// report on), never to make any itself - see its own source + the
// 'runGameCheck itself must not call fetch' assertion below.
test('no engine, data, config, or state module references fetch/XMLHttpRequest/WebSocket', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const root = path.default.dirname(new URL('../js', import.meta.url).pathname);
  const exempt = new Set(['networkMonitor.js']);
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
      const full = path.default.join(dir, entry.name);
      if (entry.isDirectory()) files = files.concat(await walk(full));
      else if (entry.name.endsWith('.js') && !exempt.has(entry.name)) files.push(full);
    }
    return files;
  }
  const files = await walk(root);
  assert.ok(files.length > 0);
  for (const file of files) {
    const source = await fs.readFile(file, 'utf8');
    assert.doesNotMatch(source, /\bfetch\s*\(/, file);
    assert.doesNotMatch(source, /XMLHttpRequest/, file);
    assert.doesNotMatch(source, /new WebSocket/, file);
  }
});

// --- 18. Run Game Check reports no failed Easy Mode tests. ---
test('runGameCheck reports all-passing for Easy mode, with a real (zero) network count', () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (...args) => {
    calls += 1;
    if (originalFetch) return originalFetch(...args);
    throw new Error('unexpected fetch');
  };
  try {
    const { results, allPassed, failCount } = runGameCheck({ externalRequestCount: 0 });
    if (!allPassed) {
      const failed = results.filter((r) => !r.passed);
      assert.fail('Run Game Check failures: ' + JSON.stringify(failed, null, 2));
    }
    assert.equal(failCount, 0);
    assert.equal(calls, 0, 'runGameCheck itself must not call fetch');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// Sanity check on chatbotEngine used directly (not just via validator).
test('chatbotEngine.processMessage drives a session to completion using a validated solution script', () => {
  const challenge = CHALLENGES.find((c) => c.id === 'refund');
  const scenario = challenge.scenarios[0];
  const solution = scenario.solutions[0];
  const easy = getDifficulty('easy');
  const session = createSession(scenario, easy, scenario.secretPool[0]);
  let lastReply = '';
  for (const message of solution.messages) {
    const result = processMessage(session, message);
    lastReply = result.botReply;
  }
  assert.equal(session.completed, true);
  assert.match(lastReply, new RegExp(scenario.secretPool[0].replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')));
});
