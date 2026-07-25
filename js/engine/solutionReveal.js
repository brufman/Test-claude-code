// Picks which solution to show a player for Give Up / Show Solution.
// It only ever returns a solution that validateSolutionPath() has just
// confirmed works for the exact challenge/scenario/difficulty in play,
// and it avoids showing the same solution twice in a row for the same
// challenge state.

import { findChallenge, findScenario } from '../data/challenges.js';
import { validateSolutionPath } from './validator.js';

/**
 * @returns {{ solution: object, validation: object } | null}
 */
export function getSolutionToReveal(challengeId, scenarioId, difficultyId, avoidSolutionId) {
  const challenge = findChallenge(challengeId);
  const scenario = findScenario(challenge, scenarioId);
  if (!scenario) return null;

  const validated = scenario.solutions
    .map((solution) => ({ solution, validation: validateSolutionPath(challengeId, scenarioId, difficultyId, solution.id) }))
    .filter((entry) => entry.validation.valid);

  if (validated.length === 0) return null;

  const nonRepeat = avoidSolutionId ? validated.filter((e) => e.solution.id !== avoidSolutionId) : validated;
  const pool = nonRepeat.length > 0 ? nonRepeat : validated;
  return pool[Math.floor(Math.random() * pool.length)];
}
