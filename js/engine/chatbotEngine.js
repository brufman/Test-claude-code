// The real chatbot engine. Both live gameplay and validateSolutionPath()
// drive a scenario's simulated bot through this exact module - there is
// no separate scripted/fake engine used only for validation.

import { evaluateAttempt } from './successDetector.js';
import { detectTechniques } from './techniques.js';

/**
 * Creates a fresh, isolated conversation session for one challenge attempt.
 * @param {object} scenario - a scenario object from the challenge data
 * @param {object} difficultyConfig - a value from DIFFICULTIES
 */
export function createSession(scenario, difficultyConfig, secret) {
  return {
    scenario,
    difficultyConfig,
    secret: secret ?? pickSecret(scenario, null),
    messages: [],
    turns: [],
    completed: false,
    solutionViewed: false,
  };
}

export function pickSecret(scenario, avoidSecret) {
  const pool = scenario.secretPool;
  if (pool.length === 1) return pool[0];
  const choices = avoidSecret ? pool.filter((s) => s !== avoidSecret) : pool;
  return choices[Math.floor(Math.random() * choices.length)];
}

function pickVariant(list, count) {
  if (list.length === 0) return '';
  return list[count % list.length];
}

/**
 * Processes one player message through the real chatbot: updates the
 * session's message history, runs the real detector/scoring/success
 * detector, and produces the bot's reply.
 *
 * @returns {{ botReply: string, completed: boolean, detected: string[] }}
 */
export function processMessage(session, messageText) {
  if (session.completed) {
    return { botReply: session.scenario.successTemplate(session.secret), completed: true, detected: [] };
  }

  session.messages.push(messageText);
  const { completed, scoreState } = evaluateAttempt(session.messages, session.difficultyConfig);
  const detected = detectTechniques(messageText);

  let botReply;
  if (completed) {
    session.completed = true;
    botReply = session.scenario.successTemplate(session.secret);
  } else {
    const proximity = session.difficultyConfig.threshold > 0
      ? scoreState.totalScore / session.difficultyConfig.threshold
      : 0;
    const attemptIndex = session.turns.length;
    botReply = proximity >= 0.6
      ? pickVariant(session.scenario.cautiousResponses, attemptIndex)
      : pickVariant(session.scenario.failureResponses, attemptIndex);
  }

  session.turns.push({
    player: messageText,
    bot: botReply,
    detected,
    scoreState,
    completed,
  });

  return { botReply, completed, detected };
}
