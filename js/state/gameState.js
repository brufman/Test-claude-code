// Game state + local persistence. Pure logic, no DOM - a fake storage
// object (see createMemoryStorage) lets this be unit tested in Node
// exactly like it runs in a browser against window.localStorage.

import { CHALLENGES, findChallenge, pickScenario } from '../data/challenges.js';
import { pickSecret } from '../engine/chatbotEngine.js';
import { getDifficulty } from '../config/difficulties.js';

const STORAGE_KEY = 'manipulation-mastery:save-v1';
const BASE_CHALLENGE_POINTS = 100;

export function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

function freshChallengeState(challenge) {
  const scenario = pickScenario(challenge, null);
  const secret = pickSecret(scenario, null);
  return {
    scenarioId: scenario.id,
    secret,
    previousSecret: null,
    messages: [],
    transcript: [],
    completed: false,
    solutionViewed: false,
    pointsAwarded: 0,
    hintsUsed: 0,
    recentScenarioIds: [scenario.id],
    lastRevealedSolutionId: null,
  };
}

export function createNewGame(difficultyId) {
  const challenges = {};
  for (const challenge of CHALLENGES) {
    challenges[challenge.id] = freshChallengeState(challenge);
  }
  return {
    version: 1,
    difficulty: difficultyId,
    challenges,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function saveGame(storage, state) {
  state.updatedAt = Date.now();
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadGame(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !parsed.challenges) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function resetGame(storage) {
  storage.removeItem(STORAGE_KEY);
}

/** Starts a new scenario variant for one challenge only; every other challenge's state is untouched. */
export function startNewVersion(state, challengeId) {
  const challenge = findChallenge(challengeId);
  const current = state.challenges[challengeId];
  const nextScenario = pickScenario(challenge, current.scenarioId);
  const nextSecret = pickSecret(nextScenario, current.secret);
  state.challenges[challengeId] = {
    scenarioId: nextScenario.id,
    secret: nextSecret,
    previousSecret: current.secret,
    messages: [],
    transcript: [],
    completed: false,
    solutionViewed: false,
    pointsAwarded: 0,
    hintsUsed: 0,
    recentScenarioIds: [...current.recentScenarioIds, nextScenario.id].slice(-5),
    lastRevealedSolutionId: null,
  };
  return state;
}

export function pointsForDifficulty(difficultyId) {
  const config = getDifficulty(difficultyId);
  return Math.round(BASE_CHALLENGE_POINTS * config.scoreMultiplier);
}

/** Awards points for a challenge exactly once - a second call is a no-op. */
export function markChallengeCompleted(state, challengeId) {
  const challengeState = state.challenges[challengeId];
  if (challengeState.completed || challengeState.solutionViewed) return challengeState;
  challengeState.completed = true;
  challengeState.pointsAwarded = pointsForDifficulty(state.difficulty);
  return challengeState;
}

/** Give Up / Show Solution: reveals the solution but always awards zero points. */
export function markSolutionViewed(state, challengeId, solutionId) {
  const challengeState = state.challenges[challengeId];
  challengeState.solutionViewed = true;
  challengeState.pointsAwarded = 0;
  if (solutionId) challengeState.lastRevealedSolutionId = solutionId;
  return challengeState;
}

export function totalScore(state) {
  return Object.values(state.challenges).reduce((sum, c) => sum + c.pointsAwarded, 0);
}

export function allChallengesResolved(state) {
  return Object.values(state.challenges).every((c) => c.completed || c.solutionViewed);
}

/** Exit Without Solutions: a results summary that never includes solution text. */
export function exitWithoutSolutions(state) {
  return Object.entries(state.challenges).map(([challengeId, c]) => ({
    challengeId,
    completed: c.completed,
    solutionViewed: c.solutionViewed,
    pointsAwarded: c.pointsAwarded,
  }));
}

/** Exit and Review Solutions: same summary, plus solution text for anything not already solved. */
export function exitAndReviewSolutions(state, revealFn) {
  return Object.entries(state.challenges).map(([challengeId, c]) => {
    const base = {
      challengeId,
      completed: c.completed,
      solutionViewed: c.solutionViewed,
      pointsAwarded: c.pointsAwarded,
    };
    if (c.completed) return base;
    const revealed = revealFn(challengeId, c.scenarioId);
    return { ...base, revealedSolution: revealed };
  });
}
