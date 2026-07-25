import test from 'node:test';
import assert from 'node:assert/strict';

import { CHALLENGES } from '../js/data/challenges.js';
import { DIFFICULTIES } from '../js/config/difficulties.js';
import { validateSolutionPath } from '../js/engine/validator.js';
import { runGameCheck } from '../js/engine/gameCheck.js';

test('Expert is now selectable, with no live analysis and Teacher Mode locked', () => {
  assert.equal(DIFFICULTIES.expert.phaseEnabled, true);
  assert.equal(DIFFICULTIES.expert.liveAnalysis, false);
  assert.equal(DIFFICULTIES.expert.showDetectedTechniques, false);
  assert.equal(DIFFICULTIES.expert.showManipulationScore, false);
  assert.equal(DIFFICULTIES.expert.teacherModeLocked, true);
  assert.equal(DIFFICULTIES.expert.minMessages, 2);
});

test('every challenge has at least one complete, validated Expert solution', () => {
  for (const challenge of CHALLENGES) {
    for (const scenario of challenge.scenarios) {
      const validated = scenario.solutions.filter(
        (sol) => validateSolutionPath(challenge.id, scenario.id, 'expert', sol.id).valid,
      );
      assert.ok(validated.length >= 1, `${scenario.id} has no validated Expert solution`);
      assert.ok(validated[0].messages.length >= 2, `${scenario.id} Expert solution should use >=2 messages`);
    }
  }
});

test('Run Game Check reports Easy, Normal, Hard, and Expert all passing', () => {
  const { results, allPassed } = runGameCheck({ externalRequestCount: 0 });
  for (const id of ['easy-mode', 'normal-mode', 'hard-mode', 'expert-mode']) {
    const result = results.find((r) => r.id === id);
    assert.ok(result && result.passed, `${id} check missing or failing`);
  }
  assert.equal(allPassed, true);
});
