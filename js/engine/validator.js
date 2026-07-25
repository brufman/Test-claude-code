// The single shared automatic solution validator described in the
// project spec. A solution may only be shown to a player once this
// function confirms it actually works - and it confirms that by running
// the solution through the exact same engine, detector, scoring, and
// success-detector used during normal play. There is no parallel fake
// validation system.

import { getDifficulty } from '../config/difficulties.js';
import { findChallenge, findScenario, findSolution } from '../data/challenges.js';
import { createSession, processMessage } from './chatbotEngine.js';

/**
 * @param {string} challengeId
 * @param {string} scenarioId
 * @param {string} difficultyId
 * @param {string} solutionId
 * @returns {{
 *   valid: boolean,
 *   reason: string,
 *   messageCount: number,
 *   finalScore: number,
 *   distinctCount: number,
 *   transcript: Array<{ player: string, bot: string }>,
 * }}
 */
export function validateSolutionPath(challengeId, scenarioId, difficultyId, solutionId) {
  const challenge = findChallenge(challengeId);
  if (!challenge) {
    return invalidResult(`Unknown challenge id: ${challengeId}`);
  }
  const scenario = findScenario(challenge, scenarioId);
  if (!scenario) {
    return invalidResult(`Unknown scenario id: ${scenarioId} for challenge ${challengeId}`);
  }
  const solution = findSolution(scenario, solutionId);
  if (!solution) {
    return invalidResult(`Unknown solution id: ${solutionId} for scenario ${scenarioId}`);
  }
  let difficultyConfig;
  try {
    difficultyConfig = getDifficulty(difficultyId);
  } catch (err) {
    return invalidResult(err.message);
  }

  // 1. Clean, isolated state for this validation run only.
  const session = createSession(scenario, difficultyConfig, scenario.secretPool[0]);
  const transcript = [];

  // 2-6. Every scripted message goes through the real chatbot engine,
  // which internally uses the real technique detector, the real scoring
  // rules, and the real success detector.
  for (const messageText of solution.messages) {
    const { botReply, completed } = processMessage(session, messageText);
    transcript.push({ player: messageText, bot: botReply });
    if (completed) break;
  }

  return {
    valid: session.completed,
    reason: session.completed
      ? 'Solution reaches the manipulation threshold and distinct-technique minimum for this difficulty.'
      : 'Solution does not reach the required manipulation score / distinct technique count for this difficulty.',
    messageCount: transcript.length,
    finalScore: session.turns.length ? session.turns[session.turns.length - 1].scoreState.totalScore : 0,
    distinctCount: session.turns.length ? session.turns[session.turns.length - 1].scoreState.distinctCount : 0,
    transcript,
  };
}

function invalidResult(reason) {
  return { valid: false, reason, messageCount: 0, finalScore: 0, distinctCount: 0, transcript: [] };
}
