// Builds Guided Mode's "why did/didn't this work" explanation from the
// real, already-computed turn data (scoreState + detected techniques)
// produced by the shared engine - it narrates real numbers, it does not
// invent them.

import { TECHNIQUES, getTechniqueById } from './techniques.js';

function labelsFor(ids) {
  return ids.map((id) => getTechniqueById(id)?.label || id);
}

export function buildAttemptFeedback(turn, difficultyConfig) {
  const { scoreState, completed, detected } = turn;
  const lines = [];

  lines.push(`Manipulation score: ${scoreState.totalScore} / ${difficultyConfig.threshold} needed.`);
  lines.push(`Distinct techniques used so far: ${scoreState.distinctCount} / ${difficultyConfig.minDistinctTechniques} needed.`);

  if (detected.length > 0) {
    lines.push(`Detected in your last message: ${labelsFor(detected).join(', ')}.`);
  } else {
    lines.push('No recognized manipulation technique was detected in your last message.');
  }

  if (completed) {
    lines.push('This attempt worked: you reached the required score with enough distinct techniques to get past the bot\'s caution.');
    return lines.join(' ');
  }

  const reasons = [];
  if (scoreState.totalScore < difficultyConfig.threshold) reasons.push('the overall manipulation score is not high enough yet');
  if (scoreState.distinctCount < difficultyConfig.minDistinctTechniques) reasons.push('you need more distinct techniques, not just one repeated');
  lines.push(`This attempt did not work yet because ${reasons.join(' and ')}.`);

  const unused = TECHNIQUES.filter((t) => !scoreState.distinctTechniques.includes(t.id));
  if (unused.length > 0) {
    const suggestion = unused[0];
    lines.push(`Next step: try adding a "${suggestion.label}" approach - ${suggestion.description}`);
  } else {
    lines.push('Next step: try increasing the pressure - combine your techniques more strongly in one message.');
  }

  return lines.join(' ');
}
