(() => {
  "use strict";

  const TIME_PER_LEVEL = 45;
  const STORAGE_KEY = "promptPolishBestScore";

  const screens = {
    title: document.getElementById("screen-title"),
    howto: document.getElementById("screen-howto"),
    game: document.getElementById("screen-game"),
    result: document.getElementById("screen-result"),
    final: document.getElementById("screen-final"),
  };

  const el = {
    bestScoreLabel: document.getElementById("best-score-label"),
    progressFill: document.getElementById("progress-fill"),
    levelLabel: document.getElementById("level-label"),
    timer: document.getElementById("timer"),
    taskText: document.getElementById("task-text"),
    badPromptText: document.getElementById("bad-prompt-text"),
    beforeOutputText: document.getElementById("before-output-text"),
    livePromptText: document.getElementById("live-prompt-text"),
    chipsGrid: document.getElementById("chips-grid"),
    resultStars: document.getElementById("result-stars"),
    resultScore: document.getElementById("result-score"),
    afterOutputText: document.getElementById("after-output-text"),
    breakdown: document.getElementById("breakdown"),
    finalHeading: document.getElementById("final-heading"),
    finalSummary: document.getElementById("final-summary"),
  };

  let levelIndex = 0;
  let totalScore = 0;
  let selected = new Set();
  let timeLeft = TIME_PER_LEVEL;
  let timerHandle = null;
  let levelResults = [];
  let currentLevel = null;

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  function getBestScore() {
    return Number(localStorage.getItem(STORAGE_KEY) || 0);
  }

  function setBestScore(v) {
    localStorage.setItem(STORAGE_KEY, String(v));
  }

  function refreshBestScoreLabel() {
    el.bestScoreLabel.textContent = `Best score: ${getBestScore()}`;
  }

  function startGame() {
    levelIndex = 0;
    totalScore = 0;
    levelResults = [];
    loadLevel(0);
    showScreen("game");
  }

  function loadLevel(i) {
    currentLevel = LEVELS[i];
    selected = new Set();
    timeLeft = TIME_PER_LEVEL;

    el.levelLabel.textContent = `Level ${i + 1} / ${LEVELS.length}`;
    el.progressFill.style.width = `${(i / LEVELS.length) * 100}%`;
    el.taskText.textContent = currentLevel.task;
    el.badPromptText.textContent = `"${currentLevel.badPrompt}"`;
    el.beforeOutputText.textContent = currentLevel.beforeOutput;
    el.timer.textContent = timeLeft;
    el.timer.classList.remove("low");

    renderChips();
    updateLivePrompt();
    startTimer();
  }

  function renderChips() {
    el.chipsGrid.innerHTML = "";
    currentLevel.chips.forEach((chip, idx) => {
      const btn = document.createElement("button");
      btn.className = "chip";
      btn.type = "button";
      btn.textContent = chip.text.trim();
      btn.addEventListener("click", () => toggleChip(idx, btn));
      el.chipsGrid.appendChild(btn);
    });
  }

  function toggleChip(idx, btn) {
    if (selected.has(idx)) {
      selected.delete(idx);
      btn.classList.remove("selected");
    } else {
      selected.add(idx);
      btn.classList.add("selected");
    }
    updateLivePrompt();
  }

  function updateLivePrompt() {
    let base = currentLevel.badPrompt.trim();
    if (/[.?!]$/.test(base)) base = base.slice(0, -1);
    const additions = currentLevel.chips
      .map((chip, idx) => (selected.has(idx) ? chip.text : ""))
      .join("");
    el.livePromptText.textContent = `"${base}${additions}."`;
  }

  function startTimer() {
    clearInterval(timerHandle);
    timerHandle = setInterval(() => {
      timeLeft -= 1;
      el.timer.textContent = Math.max(timeLeft, 0);
      if (timeLeft <= 10) el.timer.classList.add("low");
      if (timeLeft <= 0) {
        clearInterval(timerHandle);
        submitLevel();
      }
    }, 1000);
  }

  function submitLevel() {
    clearInterval(timerHandle);

    const numCorrect = currentLevel.chips.filter((c) => c.correct).length;
    let selectedCorrect = 0;
    let selectedIncorrect = 0;
    currentLevel.chips.forEach((chip, idx) => {
      if (!selected.has(idx)) return;
      if (chip.correct) selectedCorrect += 1;
      else selectedIncorrect += 1;
    });

    let stars;
    if (selectedCorrect === numCorrect && selectedIncorrect === 0) stars = 3;
    else if (selectedCorrect >= Math.ceil(numCorrect / 2) && selectedIncorrect === 0) stars = 2;
    else if (selectedCorrect >= 1) stars = 1;
    else stars = 0;

    const base = Math.max(0, selectedCorrect * 100 - selectedIncorrect * 50);
    const timeBonus = Math.max(0, timeLeft) * 2;
    const perfectBonus = stars === 3 ? 150 : 0;
    const levelScore = base + timeBonus + perfectBonus;

    totalScore += levelScore;
    levelResults.push({ stars, levelScore });

    showResult({ stars, levelScore, base, timeBonus, perfectBonus, selectedCorrect, numCorrect, selectedIncorrect });
  }

  function showResult({ stars, levelScore, base, timeBonus, perfectBonus, selectedCorrect, numCorrect, selectedIncorrect }) {
    el.resultStars.textContent = "★★★☆☆☆".slice(3 - stars, 6 - stars);
    el.resultScore.textContent = `+${levelScore}`;
    el.afterOutputText.textContent = currentLevel.afterOutput;

    const lines = [];
    lines.push(`Correct fixes found: ${selectedCorrect}/${numCorrect}`);
    if (selectedIncorrect > 0) lines.push(`Distractors picked: ${selectedIncorrect}`);
    lines.push(`Base score: ${base}`);
    if (timeBonus > 0) lines.push(`Time bonus: +${timeBonus}`);
    if (perfectBonus > 0) lines.push(`Perfect bonus: +${perfectBonus}`);
    el.breakdown.innerHTML = lines.map((l) => `<div>${l}</div>`).join("");

    document.getElementById("btn-next").textContent =
      levelIndex + 1 < LEVELS.length ? "Next Level" : "See Results";

    showScreen("result");
  }

  function nextLevel() {
    levelIndex += 1;
    if (levelIndex < LEVELS.length) {
      loadLevel(levelIndex);
      showScreen("game");
    } else {
      finishGame();
    }
  }

  function finishGame() {
    el.progressFill.style.width = "100%";
    const totalStars = levelResults.reduce((sum, r) => sum + r.stars, 0);
    const maxStars = LEVELS.length * 3;
    const isNewBest = totalScore > getBestScore();
    if (isNewBest) setBestScore(totalScore);

    el.finalHeading.textContent = isNewBest ? "New Best Score!" : "Run Complete";
    el.finalSummary.textContent =
      `Score: ${totalScore} · ${totalStars}/${maxStars} stars` +
      (isNewBest ? "" : ` · Best: ${getBestScore()}`);

    refreshBestScoreLabel();
    showScreen("final");
  }

  function quitToTitle() {
    clearInterval(timerHandle);
    refreshBestScoreLabel();
    showScreen("title");
  }

  document.getElementById("btn-play").addEventListener("click", startGame);
  document.getElementById("btn-howto").addEventListener("click", () => showScreen("howto"));
  document.getElementById("btn-howto-back").addEventListener("click", () => showScreen("title"));
  document.getElementById("btn-quit").addEventListener("click", quitToTitle);
  document.getElementById("btn-submit").addEventListener("click", submitLevel);
  document.getElementById("btn-next").addEventListener("click", nextLevel);
  document.getElementById("btn-play-again").addEventListener("click", startGame);
  document.getElementById("btn-final-title").addEventListener("click", quitToTitle);

  refreshBestScoreLabel();
})();
