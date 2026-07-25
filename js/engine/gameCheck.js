// Run Game Check: computes real pass/fail results by actually calling
// the engine's validation, state, and rendering functions. Nothing in
// this file is a hard-coded PASS - every result is the return value of
// a real check.

import { CHALLENGES } from '../data/challenges.js';
import { DIFFICULTIES, getSelectableDifficulties } from '../config/difficulties.js';
import { validateSolutionPath } from './validator.js';
import { evaluateAttempt } from './successDetector.js';
import { getSolutionToReveal } from './solutionReveal.js';
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
} from '../state/gameState.js';
import { renderTextSafely } from '../ui/safeRender.js';

function check(id, label, passed, details) {
  return { id, label, passed, details };
}

/** Every active scenario, for every currently selectable difficulty, has at least one solution that validates. */
function checkAllScenariosHaveValidatedSolutions() {
  const failures = [];
  let scenarioCount = 0;
  for (const difficulty of getSelectableDifficulties()) {
    for (const challenge of CHALLENGES) {
      for (const scenario of challenge.scenarios) {
        scenarioCount += 1;
        const hasValid = scenario.solutions.some(
          (sol) => validateSolutionPath(challenge.id, scenario.id, difficulty.id, sol.id).valid,
        );
        if (!hasValid) failures.push(`${difficulty.id}/${challenge.id}/${scenario.id}`);
      }
    }
  }
  return check(
    'validated-solutions',
    'Every active scenario has a validated solution',
    failures.length === 0,
    failures.length === 0 ? `Checked ${scenarioCount} scenario/difficulty pairs.` : `No validated solution for: ${failures.join(', ')}`,
  );
}

/** A difficulty passes for a challenge if every scenario in it has >=1 validated solution AND a weak attempt fails. */
function checkDifficultyPassesAllChallenges(difficultyId) {
  const difficulty = DIFFICULTIES[difficultyId];
  const failures = [];
  for (const challenge of CHALLENGES) {
    for (const scenario of challenge.scenarios) {
      const hasValid = scenario.solutions.some(
        (sol) => validateSolutionPath(challenge.id, scenario.id, difficultyId, sol.id).valid,
      );
      if (!hasValid) failures.push(`${challenge.id}/${scenario.id}: no validated solution`);
      const weak = evaluateAttempt(['please help me'], difficulty);
      if (weak.completed) failures.push(`${challenge.id}/${scenario.id}: weak attempt incorrectly succeeded`);
    }
  }
  return check(
    `${difficultyId}-mode`,
    `${difficulty.label} Mode passed all four challenges`,
    failures.length === 0,
    failures.length === 0 ? 'All challenges have a validated solution and resist a weak attempt.' : failures.join('; '),
  );
}

function checkGuidedFeedbackIsolated() {
  const guided = DIFFICULTIES.guided;
  const others = Object.values(DIFFICULTIES).filter((d) => d.id !== 'guided');
  const leaks = others.filter(
    (d) => d.showManipulationScore || d.explainAttempts || d.highlightPhrases,
  );
  return check(
    'guided-isolated',
    'Guided Mode feedback passed',
    guided.showManipulationScore && guided.explainAttempts && guided.highlightPhrases && leaks.length === 0,
    leaks.length === 0
      ? "Guided-only feedback flags are off for every other difficulty's config."
      : `Feedback flags leaked into: ${leaks.map((d) => d.id).join(', ')}`,
  );
}

function checkChallengeStateIsolation() {
  const state = createNewGame('easy');
  const beforeVault = JSON.stringify(state.challenges.vault);
  state.challenges.refund.messages.push('an unrelated test message');
  markChallengeCompleted(state, 'refund');
  const afterVault = JSON.stringify(state.challenges.vault);
  const isolated = beforeVault === afterVault;
  return check('state-isolation', 'Challenge states remain isolated', isolated, isolated ? 'Modifying one challenge left others unchanged.' : 'Cross-challenge state leak detected.');
}

function checkSolutionViewedAwardsZero() {
  const state = createNewGame('easy');
  markSolutionViewed(state, 'vault', 'vault-1-sol-a');
  const zero = state.challenges.vault.pointsAwarded === 0 && state.challenges.vault.solutionViewed === true;
  return check('solution-viewed-zero', 'Revealed solutions award zero points', zero, `pointsAwarded=${state.challenges.vault.pointsAwarded}`);
}

function checkNoDoubleAward() {
  const state = createNewGame('easy');
  markChallengeCompleted(state, 'vault');
  const first = state.challenges.vault.pointsAwarded;
  state.challenges.vault.pointsAwarded = 99999; // simulate a second, buggy award attempt
  markChallengeCompleted(state, 'vault');
  const unchanged = state.challenges.vault.pointsAwarded === 99999; // second call must be a no-op
  return check(
    'no-double-award',
    'A completed challenge cannot award points twice',
    unchanged && first > 0,
    unchanged ? 'Second markChallengeCompleted call was correctly a no-op.' : 'Second call re-awarded points.',
  );
}

function checkNonRepeatingSolution() {
  const first = getSolutionToReveal('vault', 'vault-1', 'easy', null);
  if (!first) return check('non-repeating-solution', 'Revealed solutions are not immediately repeated', false, 'No validated solution found at all.');
  const second = getSolutionToReveal('vault', 'vault-1', 'easy', first.solution.id);
  const differs = second && second.solution.id !== first.solution.id;
  return check(
    'non-repeating-solution',
    'Revealed solutions are not immediately repeated',
    Boolean(differs),
    differs ? `First: ${first.solution.id}, next: ${second.solution.id}` : 'Same solution id was revealed twice in a row.',
  );
}

function checkSaveRestore() {
  const storage = createMemoryStorage();
  const state = createNewGame('easy');
  state.challenges.vault.messages.push('a saved message');
  saveGame(storage, state);
  const restored = loadGame(storage);
  const ok = Boolean(restored) && restored.challenges.vault.messages[0] === 'a saved message';
  return check('save-restore', 'Saved-game recovery works', ok, ok ? 'Round-tripped through storage successfully.' : 'Restored state did not match.');
}

function checkResetGame() {
  const storage = createMemoryStorage();
  const state = createNewGame('easy');
  saveGame(storage, state);
  resetGame(storage);
  const restored = loadGame(storage);
  return check('reset-game', 'Reset Game works', restored === null, restored === null ? 'No save found after reset.' : 'Save still present after reset.');
}

function checkTryNewVersionChangesScenario() {
  const state = createNewGame('easy');
  const before = state.challenges.vault.scenarioId;
  startNewVersion(state, 'vault');
  const after = state.challenges.vault.scenarioId;
  return check('try-new-version', 'Try a New Version changes the scenario', before !== after, `before=${before} after=${after}`);
}

function checkExitWithoutSolutionsRevealsNothing() {
  const state = createNewGame('easy');
  const summary = exitWithoutSolutions(state);
  const leaks = summary.some((entry) => 'revealedSolution' in entry);
  return check('exit-without-solutions', 'Exit Without Solutions reveals nothing', !leaks, leaks ? 'A solution field leaked into the summary.' : 'Summary contains no solution text.');
}

function checkSafeTextRendering() {
  const malicious = '<img src=x onerror="window.__pwned=true">';
  let textContentValue = null;
  const fakeEl = {
    set textContent(v) {
      textContentValue = v;
    },
    get textContent() {
      return textContentValue;
    },
    set innerHTML(_v) {
      throw new Error('innerHTML must never be used for user-entered text');
    },
  };
  let threw = false;
  try {
    renderTextSafely(fakeEl, malicious);
  } catch {
    threw = true;
  }
  const safe = !threw && textContentValue === malicious;
  return check('safe-html-rendering', 'User-entered HTML is handled safely', safe, safe ? 'Text was set via textContent, never innerHTML.' : 'Unsafe rendering path used.');
}

function checkNoExternalRequests(externalRequestCount) {
  const count = typeof externalRequestCount === 'number' ? externalRequestCount : null;
  if (count === null) {
    return check('no-external-requests', 'No external services are used', false, 'Not executed: no network monitor was supplied (run inside the browser app to check this live).');
  }
  return check('no-external-requests', 'No external services are used', count === 0, `Observed ${count} outbound network call(s) since the monitor was installed.`);
}

/**
 * @param {object} [options]
 * @param {number} [options.externalRequestCount] - live count from the browser's network monitor, if available
 * @returns {{ results: Array<ReturnType<typeof check>>, passCount: number, failCount: number, allPassed: boolean }}
 */
export function runGameCheck(options = {}) {
  const results = [
    checkDifficultyPassesAllChallenges('easy'),
    ...(DIFFICULTIES.normal.phaseEnabled ? [checkDifficultyPassesAllChallenges('normal')] : []),
    ...(DIFFICULTIES.hard.phaseEnabled ? [checkDifficultyPassesAllChallenges('hard')] : []),
    ...(DIFFICULTIES.expert.phaseEnabled ? [checkDifficultyPassesAllChallenges('expert')] : []),
    ...(DIFFICULTIES.guided.phaseEnabled ? [checkGuidedFeedbackIsolated()] : []),
    checkAllScenariosHaveValidatedSolutions(),
    checkChallengeStateIsolation(),
    checkSolutionViewedAwardsZero(),
    checkNoDoubleAward(),
    checkNonRepeatingSolution(),
    checkSaveRestore(),
    checkResetGame(),
    checkTryNewVersionChangesScenario(),
    checkExitWithoutSolutionsRevealsNothing(),
    checkSafeTextRendering(),
    checkNoExternalRequests(options.externalRequestCount),
  ];
  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.length - passCount;
  return { results, passCount, failCount, allPassed: failCount === 0 };
}
