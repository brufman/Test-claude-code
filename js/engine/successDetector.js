// The one real challenge-success detector. Live gameplay and
// validateSolutionPath() both call this - no scenario or difficulty
// gets its own bespoke "did they win" logic.

import { computeScoreState } from './scoring.js';

/**
 * @param {string[]} messages - all player messages sent so far in this challenge attempt
 * @param {object} difficultyConfig - a value from DIFFICULTIES
 * @returns {{ completed: boolean, scoreState: ReturnType<typeof computeScoreState> }}
 */
export function evaluateAttempt(messages, difficultyConfig) {
  const scoreState = computeScoreState(messages, difficultyConfig);
  const completed =
    messages.length >= (difficultyConfig.minMessages || 1) &&
    scoreState.totalScore >= difficultyConfig.threshold &&
    scoreState.distinctCount >= difficultyConfig.minDistinctTechniques;
  return { completed, scoreState };
}
