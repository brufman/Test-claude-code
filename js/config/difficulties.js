// Single source of truth for every difficulty level's configuration.
// The chatbot engine, scoring, and success detector all read these
// values instead of branching on difficulty id - this is what lets
// every difficulty share one engine instead of five copies of it.
//
// PHASE FLAG: `phaseEnabled` controls whether a level is selectable in
// the running game yet. It exists only so difficulty levels can be
// delivered in verified phases; it does not change any game rule.

export const DIFFICULTIES = {
  guided: {
    id: 'guided',
    label: 'Guided',
    tagline: 'Best for first-time players',
    threshold: 2,
    minDistinctTechniques: 1,
    hintLimit: Infinity,
    hintStyle: 'direct',
    showDetectedTechniques: true,
    showManipulationScore: true,
    showThreshold: true,
    explainAttempts: true,
    highlightPhrases: true,
    liveAnalysis: true,
    repetitionMode: 'capped',
    repetitionCap: 3,
    scoreMultiplier: 0.5,
    minMessages: 1,
    teacherModeLocked: false,
    phaseEnabled: true,
    order: 1,
  },
  easy: {
    id: 'easy',
    label: 'Easy',
    tagline: '',
    threshold: 3,
    minDistinctTechniques: 1,
    hintLimit: Infinity,
    hintStyle: 'direct',
    showDetectedTechniques: true,
    showManipulationScore: false,
    showThreshold: false,
    explainAttempts: false,
    highlightPhrases: false,
    liveAnalysis: true,
    repetitionMode: 'capped',
    repetitionCap: 3,
    scoreMultiplier: 1,
    minMessages: 1,
    teacherModeLocked: false,
    phaseEnabled: true,
    order: 2,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    tagline: 'Recommended',
    threshold: 5,
    minDistinctTechniques: 2,
    hintLimit: 3,
    hintStyle: 'direct',
    showDetectedTechniques: false,
    showManipulationScore: false,
    showThreshold: false,
    explainAttempts: false,
    highlightPhrases: false,
    liveAnalysis: true,
    repetitionMode: 'dedupeExact',
    scoreMultiplier: 1.5,
    minMessages: 1,
    teacherModeLocked: false,
    phaseEnabled: true,
    order: 3,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    tagline: '',
    threshold: 7,
    minDistinctTechniques: 3,
    hintLimit: 2,
    hintStyle: 'indirect',
    showDetectedTechniques: false,
    showManipulationScore: false,
    showThreshold: false,
    explainAttempts: false,
    highlightPhrases: false,
    liveAnalysis: true,
    repetitionMode: 'diminishing',
    scoreMultiplier: 2,
    minMessages: 1,
    teacherModeLocked: false,
    phaseEnabled: true,
    order: 4,
  },
  expert: {
    id: 'expert',
    label: 'Expert',
    tagline: '',
    threshold: 9,
    minDistinctTechniques: 3,
    hintLimit: 1,
    hintStyle: 'vague',
    showDetectedTechniques: false,
    showManipulationScore: false,
    showThreshold: false,
    explainAttempts: false,
    highlightPhrases: false,
    liveAnalysis: false,
    repetitionMode: 'dedupeExact',
    scoreMultiplier: 3,
    minMessages: 2,
    teacherModeLocked: true,
    phaseEnabled: true,
    order: 5,
  },
};

export const DIFFICULTY_DISPLAY_ORDER = ['guided', 'easy', 'normal', 'hard', 'expert'];

export function getDifficulty(id) {
  const config = DIFFICULTIES[id];
  if (!config) throw new Error(`Unknown difficulty id: ${id}`);
  return config;
}

export function getSelectableDifficulties() {
  return DIFFICULTY_DISPLAY_ORDER.map((id) => DIFFICULTIES[id]).filter((d) => d.phaseEnabled);
}
