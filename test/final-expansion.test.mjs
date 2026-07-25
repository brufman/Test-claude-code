import test from 'node:test';
import assert from 'node:assert/strict';

import { CHALLENGES } from '../js/data/challenges.js';
import { getSelectableDifficulties, DIFFICULTIES } from '../js/config/difficulties.js';
import { validateSolutionPath } from '../js/engine/validator.js';
import { runGameCheck } from '../js/engine/gameCheck.js';

test('every challenge now has at least 5 scenario variants', () => {
  for (const challenge of CHALLENGES) {
    assert.ok(challenge.scenarios.length >= 5, `${challenge.id} has only ${challenge.scenarios.length} scenarios`);
  }
});

test('all scenario ids remain unique after expansion', () => {
  const ids = new Set();
  for (const challenge of CHALLENGES) {
    for (const scenario of challenge.scenarios) {
      assert.ok(!ids.has(scenario.id), `duplicate scenario id ${scenario.id}`);
      ids.add(scenario.id);
    }
  }
});

test('every scenario has complete instructions, an everyday topic, and >=2 solution paths', () => {
  for (const challenge of CHALLENGES) {
    for (const scenario of challenge.scenarios) {
      assert.ok(scenario.instructions.length > 10, scenario.id);
      assert.ok(scenario.topic.length > 0, scenario.id);
      assert.ok(scenario.solutions.length >= 2, scenario.id);
      assert.ok(scenario.explanation.length > 10, scenario.id);
    }
  }
});

test('every scenario has a validated solution for all five difficulty levels', () => {
  const failures = [];
  for (const difficulty of getSelectableDifficulties()) {
    for (const challenge of CHALLENGES) {
      for (const scenario of challenge.scenarios) {
        const ok = scenario.solutions.some(
          (sol) => validateSolutionPath(challenge.id, scenario.id, difficulty.id, sol.id).valid,
        );
        if (!ok) failures.push(`${difficulty.id}/${scenario.id}`);
      }
    }
  }
  assert.deepEqual(failures, []);
});

test('new scenarios use non-repeating example text (no scenario duplicates another\'s first solution message)', () => {
  const firstMessages = new Set();
  for (const challenge of CHALLENGES) {
    for (const scenario of challenge.scenarios) {
      const firstSolutionMessage = scenario.solutions[0].messages[0];
      assert.ok(!firstMessages.has(firstSolutionMessage), `duplicate example message: ${firstSolutionMessage}`);
      firstMessages.add(firstSolutionMessage);
    }
  }
});

test('all five difficulty levels are enabled for final delivery', () => {
  for (const id of ['guided', 'easy', 'normal', 'hard', 'expert']) {
    assert.equal(DIFFICULTIES[id].phaseEnabled, true, `${id} should be enabled in the final delivery`);
  }
});

test('Run Game Check is fully green after the scenario expansion', () => {
  const { results, allPassed, failCount } = runGameCheck({ externalRequestCount: 0 });
  if (!allPassed) {
    assert.fail('Run Game Check failures: ' + JSON.stringify(results.filter((r) => !r.passed), null, 2));
  }
  assert.equal(failCount, 0);
});
