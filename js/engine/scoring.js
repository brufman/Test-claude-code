// Real manipulation scoring engine. Used identically by live gameplay
// and by validateSolutionPath() - there is no separate "fake" scoring
// path for validation.

import { detectTechniques } from './techniques.js';

const BASE_TECHNIQUE_VALUE = 2;

function normalizeMessage(text) {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function valueForOccurrence(mode, priorOccurrenceCount, isExactDuplicateMessage, config) {
  if (mode === 'capped') {
    const cap = config.repetitionCap ?? 3;
    return priorOccurrenceCount < cap ? BASE_TECHNIQUE_VALUE : 0;
  }
  if (mode === 'dedupeExact') {
    return isExactDuplicateMessage ? 0 : BASE_TECHNIQUE_VALUE;
  }
  if (mode === 'diminishing') {
    if (isExactDuplicateMessage) return 0;
    if (priorOccurrenceCount >= 4) return 0;
    return BASE_TECHNIQUE_VALUE * 0.5 ** priorOccurrenceCount;
  }
  throw new Error(`Unknown repetition mode: ${mode}`);
}

/**
 * Walks every message in a conversation (in order) through the real
 * technique detector and computes the cumulative manipulation score
 * according to a difficulty's repetition rules.
 *
 * @param {string[]} messages - player messages, in the order they were sent
 * @param {object} difficultyConfig - a value from DIFFICULTIES
 * @returns {{
 *   totalScore: number,
 *   distinctTechniques: string[],
 *   distinctCount: number,
 *   perMessageDetections: string[][],
 *   occurrencesByTechnique: Record<string, number>,
 * }}
 */
export function computeScoreState(messages, difficultyConfig) {
  const occurrencesByTechnique = {};
  const distinct = new Set();
  const seenExactMessages = new Set();
  const perMessageDetections = [];
  let totalScore = 0;

  for (const rawText of messages) {
    const normalized = normalizeMessage(rawText);
    const isExactDuplicateMessage = seenExactMessages.has(normalized);
    seenExactMessages.add(normalized);

    const detected = detectTechniques(rawText);
    perMessageDetections.push(detected);

    for (const techniqueId of detected) {
      const priorCount = occurrencesByTechnique[techniqueId] || 0;
      const value = valueForOccurrence(
        difficultyConfig.repetitionMode,
        priorCount,
        isExactDuplicateMessage,
        difficultyConfig,
      );
      totalScore += value;
      if (value > 0) distinct.add(techniqueId);
      occurrencesByTechnique[techniqueId] = priorCount + 1;
    }
  }

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    distinctTechniques: [...distinct],
    distinctCount: distinct.size,
    perMessageDetections,
    occurrencesByTechnique,
  };
}
