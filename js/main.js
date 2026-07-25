import { CHALLENGES, findChallenge, findScenario } from './data/challenges.js';
import { getDifficulty, getSelectableDifficulties, DIFFICULTY_DISPLAY_ORDER } from './config/difficulties.js';
import { TECHNIQUES, detectTechniques } from './engine/techniques.js';
import { createSession, processMessage } from './engine/chatbotEngine.js';
import { getHint, hintLimitReached } from './engine/hints.js';
import { getSolutionToReveal } from './engine/solutionReveal.js';
import { runGameCheck } from './engine/gameCheck.js';
import { renderTextSafely, renderHighlighted } from './ui/safeRender.js';
import { installNetworkMonitor, getExternalRequestCount } from './state/networkMonitor.js';
import {
  createNewGame,
  saveGame,
  loadGame,
  resetGame,
  startNewVersion,
  markChallengeCompleted,
  markSolutionViewed,
  exitWithoutSolutions,
  exitAndReviewSolutions,
  totalScore,
  pointsForDifficulty,
} from './state/gameState.js';

// This flag exists only for Phase 1 delivery and must be removed before final release.
const SHOW_PHASE_NOTICE = true;

const storage = window.localStorage;

let gameState = null;
const sessions = {};
let currentChallengeId = null;
let selectedDifficultyId = null;

const el = (id) => document.getElementById(id);

function showScreen(id, { moveFocus = true } = {}) {
  for (const screen of document.querySelectorAll('.screen')) {
    screen.hidden = screen.id !== id;
  }
  if (!moveFocus) return;
  // Move focus to the new screen's heading so screen readers announce
  // the transition - but this must never run on the very first render,
  // or it steals focus from the skip link before the keyboard user gets
  // a chance to use it.
  const heading = document.querySelector(`#${id} h2`);
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus();
  }
}

function techniqueLabelsFor(ids) {
  return ids.map((id) => TECHNIQUES.find((t) => t.id === id)?.label || id);
}

// ---------- Start screen ----------

function renderDifficultyOptions() {
  const container = el('difficulty-options');
  container.innerHTML = '';
  const selectable = getSelectableDifficulties();
  if (!selectedDifficultyId) {
    const preferred = selectable.find((d) => d.id === 'normal') || selectable[0];
    selectedDifficultyId = preferred.id;
  }
  for (const difficulty of selectable) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'difficulty-card';
    button.setAttribute('aria-pressed', String(difficulty.id === selectedDifficultyId));
    button.dataset.difficultyId = difficulty.id;

    const name = document.createElement('div');
    name.textContent = difficulty.label;
    button.appendChild(name);

    if (difficulty.tagline) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = difficulty.tagline;
      button.appendChild(badge);
    }

    button.addEventListener('click', () => {
      selectedDifficultyId = difficulty.id;
      for (const c of container.querySelectorAll('.difficulty-card')) {
        c.setAttribute('aria-pressed', String(c.dataset.difficultyId === selectedDifficultyId));
      }
    });
    container.appendChild(button);
  }
}

function renderTechniqueList() {
  const list = el('technique-list');
  list.innerHTML = '';
  for (const technique of TECHNIQUES) {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = technique.label + ': ';
    li.appendChild(strong);
    li.appendChild(document.createTextNode(technique.description));
    list.appendChild(li);
  }
}

function refreshContinueBanner() {
  const saved = loadGame(storage);
  el('continue-banner').hidden = !saved;
}

// ---------- Game session bootstrapping ----------

function buildSessionForChallenge(challengeId) {
  const challenge = findChallenge(challengeId);
  const challengeState = gameState.challenges[challengeId];
  const scenario = findScenario(challenge, challengeState.scenarioId);
  const difficultyConfig = getDifficulty(gameState.difficulty);
  const session = createSession(scenario, difficultyConfig, challengeState.secret);
  // Rebuild internal engine bookkeeping from persisted player messages
  // without touching the already-loaded transcript.
  for (const message of challengeState.messages) {
    processMessage(session, message);
  }
  sessions[challengeId] = session;
}

function initSessionsFromState() {
  for (const challenge of CHALLENGES) {
    buildSessionForChallenge(challenge.id);
  }
}

function startNewGameFlow() {
  gameState = createNewGame(selectedDifficultyId);
  initSessionsFromState();
  currentChallengeId = CHALLENGES[0].id;
  saveGame(storage, gameState);
  renderGameScreen();
  showScreen('screen-game');
}

function continueGameFlow() {
  const saved = loadGame(storage);
  if (!saved) return;
  gameState = saved;
  initSessionsFromState();
  currentChallengeId = CHALLENGES.find((c) => !gameState.challenges[c.id].completed && !gameState.challenges[c.id].solutionViewed)?.id
    || CHALLENGES[0].id;
  renderGameScreen();
  showScreen('screen-game');
}

// ---------- Game screen ----------

function statusLabel(challengeState) {
  if (challengeState.completed) return { text: 'Completed', className: 'status-completed' };
  if (challengeState.solutionViewed) return { text: 'Solution Viewed', className: 'status-viewed' };
  if (challengeState.messages.length > 0) return { text: 'In Progress', className: '' };
  return { text: 'Not Started', className: '' };
}

function renderChallengeTabs() {
  const nav = el('challenge-tabs');
  nav.innerHTML = '';
  for (const challenge of CHALLENGES) {
    const challengeState = gameState.challenges[challenge.id];
    const status = statusLabel(challengeState);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'challenge-tab';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(challenge.id === currentChallengeId));
    button.setAttribute('aria-pressed', String(challenge.id === currentChallengeId));
    button.textContent = `${challenge.title} - ${status.text}`;
    button.addEventListener('click', () => {
      currentChallengeId = challenge.id;
      renderGameScreen();
    });
    nav.appendChild(button);
  }
}

function renderScenarioPanel() {
  const challenge = findChallenge(currentChallengeId);
  const challengeState = gameState.challenges[currentChallengeId];
  const scenario = findScenario(challenge, challengeState.scenarioId);
  const difficultyConfig = getDifficulty(gameState.difficulty);

  renderTextSafely(el('scenario-title'), `${challenge.title}: ${scenario.title}`);
  renderTextSafely(el('scenario-instructions'), scenario.instructions);

  const points = pointsForDifficulty(gameState.difficulty);
  const statusEl = el('challenge-points-status');
  if (challengeState.completed) {
    renderTextSafely(statusEl, `Completed - earned ${challengeState.pointsAwarded} points.`);
  } else if (challengeState.solutionViewed) {
    renderTextSafely(statusEl, 'Solution viewed - 0 points for this challenge.');
  } else {
    let message = `Worth ${points} points if you succeed on your own.`;
    if (difficultyConfig.showThreshold) {
      message += ` Threshold: manipulation score ${difficultyConfig.threshold}, distinct techniques ${difficultyConfig.minDistinctTechniques}.`;
    }
    renderTextSafely(statusEl, message);
  }
}

function renderChatLog() {
  const log = el('chat-log');
  log.innerHTML = '';
  const challengeState = gameState.challenges[currentChallengeId];
  const difficultyConfig = getDifficulty(gameState.difficulty);
  for (const entry of challengeState.transcript) {
    const wrapper = document.createElement('div');
    wrapper.className = `chat-message ${entry.role}`;
    const sender = document.createElement('span');
    sender.className = 'sender';
    sender.textContent = entry.role === 'player' ? 'You' : findChallenge(currentChallengeId).botName;
    wrapper.appendChild(sender);

    const body = document.createElement('div');
    if (entry.role === 'player' && difficultyConfig.highlightPhrases) {
      const detected = detectTechniques(entry.text);
      const ranges = [];
      // Highlighting uses only the detector's own regexes against this
      // exact message; no raw HTML from the player is ever used as markup.
      renderHighlighted(body, entry.text, ranges);
      if (detected.length > 0) body.title = techniqueLabelsFor(detected).join(', ');
    } else {
      renderTextSafely(body, entry.text);
    }
    wrapper.appendChild(body);
    log.appendChild(wrapper);
  }
  log.scrollTop = log.scrollHeight;
}

function renderDetectedTechniques() {
  const container = el('detected-techniques');
  const difficultyConfig = getDifficulty(gameState.difficulty);
  const session = sessions[currentChallengeId];
  const lastTurn = session.turns[session.turns.length - 1];
  if (!difficultyConfig.showDetectedTechniques || !lastTurn || lastTurn.detected.length === 0) {
    container.textContent = '';
    return;
  }
  renderTextSafely(container, `Detected in your last message: ${techniqueLabelsFor(lastTurn.detected).join(', ')}`);
}

function updateControlsAvailability() {
  const challengeState = gameState.challenges[currentChallengeId];
  const resolved = challengeState.completed || challengeState.solutionViewed;
  el('chat-input').disabled = resolved;
  el('btn-send').disabled = resolved;
  el('btn-give-up').disabled = resolved;
  el('btn-hint').disabled = resolved;
  el('chat-input').placeholder = resolved ? 'This challenge is finished. Try a New Version to play again.' : 'Type your message...';
}

function renderGameScreen() {
  renderChallengeTabs();
  renderScenarioPanel();
  renderChatLog();
  renderDetectedTechniques();
  updateControlsAvailability();
  el('hint-panel').hidden = true;
  el('feedback-panel').hidden = true;
}

function handleSendMessage(event) {
  event.preventDefault();
  const input = el('chat-input');
  const text = input.value.trim();
  if (!text) return;

  const challengeState = gameState.challenges[currentChallengeId];
  const session = sessions[currentChallengeId];

  challengeState.transcript.push({ role: 'player', text });
  challengeState.messages.push(text);

  const { botReply, completed } = processMessage(session, text);
  challengeState.transcript.push({ role: 'bot', text: botReply });

  if (completed) {
    markChallengeCompleted(gameState, currentChallengeId);
  }

  saveGame(storage, gameState);
  input.value = '';
  renderChallengeTabs();
  renderScenarioPanel();
  renderChatLog();
  renderDetectedTechniques();
  updateControlsAvailability();
  input.focus();
}

function handleHint() {
  const challengeState = gameState.challenges[currentChallengeId];
  const difficultyConfig = getDifficulty(gameState.difficulty);
  const challenge = findChallenge(currentChallengeId);
  const scenario = findScenario(challenge, challengeState.scenarioId);
  const panel = el('hint-panel');

  if (hintLimitReached(challengeState.hintsUsed, difficultyConfig)) {
    renderTextSafely(panel, 'No hints remaining for this challenge.');
    panel.hidden = false;
    return;
  }
  const hintText = getHint(scenario, difficultyConfig, challengeState.hintsUsed);
  challengeState.hintsUsed += 1;
  saveGame(storage, gameState);
  renderTextSafely(panel, hintText);
  panel.hidden = false;
}

function handleGiveUp() {
  const challengeState = gameState.challenges[currentChallengeId];
  const challenge = findChallenge(currentChallengeId);
  const revealed = getSolutionToReveal(currentChallengeId, challengeState.scenarioId, gameState.difficulty, challengeState.lastRevealedSolutionId);
  const scenario = findScenario(challenge, challengeState.scenarioId);

  markSolutionViewed(gameState, currentChallengeId, revealed ? revealed.solution.id : null);

  const panel = el('feedback-panel');
  panel.innerHTML = '';
  const heading = document.createElement('strong');
  heading.textContent = revealed ? 'Here is a working solution:' : 'No validated solution is available right now.';
  panel.appendChild(heading);

  if (revealed) {
    const list = document.createElement('ol');
    for (const message of revealed.solution.messages) {
      const li = document.createElement('li');
      li.textContent = message;
      list.appendChild(li);
    }
    panel.appendChild(list);

    const secretLine = document.createElement('p');
    secretLine.textContent = `Revealed code: ${challengeState.secret}`;
    panel.appendChild(secretLine);

    const explanation = document.createElement('p');
    explanation.textContent = scenario.explanation;
    panel.appendChild(explanation);
  }
  panel.hidden = false;

  saveGame(storage, gameState);
  renderChallengeTabs();
  renderScenarioPanel();
  updateControlsAvailability();
}

function handleNewVersion() {
  startNewVersion(gameState, currentChallengeId);
  buildSessionForChallenge(currentChallengeId);
  saveGame(storage, gameState);
  renderGameScreen();
}

// ---------- Results screen ----------

function renderResults(entries) {
  const list = el('results-list');
  list.innerHTML = '';
  renderTextSafely(el('results-total'), `Total score: ${totalScore(gameState)} points`);

  for (const entry of entries) {
    const challenge = findChallenge(entry.challengeId);
    const card = document.createElement('div');
    card.className = 'result-card';

    const title = document.createElement('h3');
    title.textContent = challenge.title;
    card.appendChild(title);

    const status = document.createElement('p');
    const label = entry.completed ? 'Completed' : entry.solutionViewed ? 'Solution Viewed' : 'Not Resolved';
    const className = entry.completed ? 'status-completed' : entry.solutionViewed ? 'status-viewed' : 'status-unresolved';
    status.className = className;
    status.textContent = `${label} - ${entry.pointsAwarded} points`;
    card.appendChild(status);

    if (entry.revealedSolution) {
      const solutionHeading = document.createElement('p');
      solutionHeading.textContent = 'Example solution:';
      card.appendChild(solutionHeading);
      const list2 = document.createElement('ol');
      for (const message of entry.revealedSolution.solution.messages) {
        const li = document.createElement('li');
        li.textContent = message;
        list2.appendChild(li);
      }
      card.appendChild(list2);
    }

    list.appendChild(card);
  }
}

function handleExitWithoutSolutions() {
  const entries = exitWithoutSolutions(gameState);
  renderResults(entries);
  showScreen('screen-results');
}

function handleExitAndReview() {
  const entries = exitAndReviewSolutions(gameState, (challengeId, scenarioId) =>
    getSolutionToReveal(challengeId, scenarioId, gameState.difficulty, gameState.challenges[challengeId].lastRevealedSolutionId),
  );
  renderResults(entries);
  showScreen('screen-results');
}

// ---------- Run Game Check ----------

function renderCheckResults() {
  const { results, passCount, failCount, allPassed } = runGameCheck({ externalRequestCount: getExternalRequestCount() });
  renderTextSafely(el('check-summary'), allPassed
    ? `All ${passCount} checks passed.`
    : `${passCount} checks passed, ${failCount} checks failed.`);

  const list = el('check-results');
  list.innerHTML = '';
  for (const result of results) {
    const li = document.createElement('li');
    li.className = result.passed ? 'pass' : 'fail';
    const label = document.createElement('span');
    label.textContent = `${result.passed ? 'PASS' : 'FAIL'} - ${result.label}`;
    li.appendChild(label);
    const details = document.createElement('span');
    details.className = 'check-details';
    details.textContent = result.details;
    li.appendChild(details);
    list.appendChild(li);
  }
}

// ---------- Wiring ----------

function init() {
  installNetworkMonitor(window);
  el('phase-notice').hidden = !SHOW_PHASE_NOTICE;

  renderDifficultyOptions();
  renderTechniqueList();
  refreshContinueBanner();

  el('btn-how-to-play').addEventListener('click', () => showScreen('screen-how-to-play'));
  el('btn-htp-back').addEventListener('click', () => showScreen('screen-start'));
  el('btn-start').addEventListener('click', startNewGameFlow);
  el('btn-continue').addEventListener('click', continueGameFlow);
  el('btn-reset-game').addEventListener('click', () => {
    if (!window.confirm('Reset all saved progress? This cannot be undone.')) return;
    resetGame(storage);
    gameState = null;
    refreshContinueBanner();
  });
  el('btn-run-check').addEventListener('click', () => {
    renderCheckResults();
    showScreen('screen-game-check');
  });
  el('btn-check-back').addEventListener('click', () => showScreen('screen-start'));

  el('chat-form').addEventListener('submit', handleSendMessage);
  el('btn-hint').addEventListener('click', handleHint);
  el('btn-give-up').addEventListener('click', handleGiveUp);
  el('btn-new-version').addEventListener('click', handleNewVersion);
  el('btn-exit-no-solutions').addEventListener('click', handleExitWithoutSolutions);
  el('btn-exit-review').addEventListener('click', handleExitAndReview);
  el('btn-play-again').addEventListener('click', () => {
    refreshContinueBanner();
    showScreen('screen-start');
  });

  showScreen('screen-start', { moveFocus: false });
}

init();
