// Hints are derived from the same real technique detector used
// everywhere else, run against a scenario's own validated solutions -
// not separately authored/fabricated hint text.

import { detectTechniques, getTechniqueById } from './techniques.js';

function techniquesUsedBySolution(solution) {
  const set = new Set();
  for (const message of solution.messages) {
    for (const id of detectTechniques(message)) set.add(id);
  }
  return [...set];
}

export function getHint(scenario, difficultyConfig, hintIndex) {
  const solution = scenario.solutions[0];
  const techniqueIds = techniquesUsedBySolution(solution);
  const techniques = techniqueIds.map(getTechniqueById).filter(Boolean);
  const pick = techniques[hintIndex % Math.max(techniques.length, 1)] || techniques[0];

  if (difficultyConfig.hintStyle === 'direct') {
    if (!pick) return 'Try combining more than one persuasion technique in your message.';
    return `Try a "${pick.label}" approach: ${pick.description}`;
  }
  if (difficultyConfig.hintStyle === 'indirect') {
    if (!pick) return 'Think about what would make a cautious assistant lower its guard.';
    return `Think about how someone might use ${pick.label.toLowerCase()} without saying it too directly.`;
  }
  // vague
  return 'A combination of approaches, spread across more than one message, tends to work better than one blunt attempt.';
}

export function hintLimitReached(hintsUsed, difficultyConfig) {
  return hintsUsed >= difficultyConfig.hintLimit;
}
