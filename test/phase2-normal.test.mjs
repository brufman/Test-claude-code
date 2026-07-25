import test from 'node:test';
import assert from 'node:assert/strict';

import { CHALLENGES } from '../js/data/challenges.js';
import { DIFFICULTIES } from '../js/config/difficulties.js';
import { validateSolutionPath } from '../js/engine/validator.js';
import { getSolutionToReveal } from '../js/engine/solutionReveal.js';
import { runGameCheck } from '../js/engine/gameCheck.js';

test('Normal is now selectable and is the recommended default', () => {
  assert.equal(DIFFICULTIES.normal.phaseEnabled, true);
  assert.equal(DIFFICULTIES.normal.tagline, 'Recommended');
});

test('all four challenges can still be completed under Normal (every scenario has a validated Normal solution)', () => {
  for (const challenge of CHALLENGES) {
    for (const scenario of challenge.scenarios) {
      const validCount = scenario.solutions.filter(
        (sol) => validateSolutionPath(challenge.id, scenario.id, 'normal', sol.id).valid,
      ).length;
      assert.ok(validCount >= 1, `${scenario.id} has no validated Normal solution`);
    }
  }
});

test('weak Easy solutions do not necessarily work on Normal', () => {
  let weakSolutionsThatFailNormal = 0;
  for (const challenge of CHALLENGES) {
    for (const scenario of challenge.scenarios) {
      const easyOnlySolution = scenario.solutions.find((s) => s.id.endsWith('-sol-a'));
      const result = validateSolutionPath(challenge.id, scenario.id, 'normal', easyOnlySolution.id);
      if (!result.valid) weakSolutionsThatFailNormal += 1;
    }
  }
  assert.ok(weakSolutionsThatFailNormal > 0, 'expected at least one Easy-only solution to fail under Normal');
});

test('Give Up displays a valid Normal solution', () => {
  for (const challenge of CHALLENGES) {
    for (const scenario of challenge.scenarios) {
      const revealed = getSolutionToReveal(challenge.id, scenario.id, 'normal', null);
      assert.ok(revealed, `${scenario.id} should have a Normal-revealable solution`);
      const revalidated = validateSolutionPath(challenge.id, scenario.id, 'normal', revealed.solution.id);
      assert.equal(revalidated.valid, true);
    }
  }
});

test('Easy Mode still works exactly as before', () => {
  for (const challenge of CHALLENGES) {
    for (const scenario of challenge.scenarios) {
      const validCount = scenario.solutions.filter(
        (sol) => validateSolutionPath(challenge.id, scenario.id, 'easy', sol.id).valid,
      ).length;
      assert.ok(validCount >= 1, `${scenario.id} regressed on Easy`);
    }
  }
});

test('Run Game Check now also reports Normal Mode results, and both Easy and Normal pass', () => {
  const { results, allPassed } = runGameCheck({ externalRequestCount: 0 });
  const easyResult = results.find((r) => r.id === 'easy-mode');
  const normalResult = results.find((r) => r.id === 'normal-mode');
  assert.ok(easyResult && easyResult.passed);
  assert.ok(normalResult && normalResult.passed);
  assert.equal(allPassed, true);
});
