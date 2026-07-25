# Test Report — Manipulation Mastery

This report covers the phased build described in the project brief: Easy
first, then Normal, Hard, Expert, and Guided added one at a time, each only
after the previous phase's required checks passed, followed by a final
scenario expansion.

All results below come from two real sources, not narrative claims:

1. An automated Node test suite (`npm test`, `node --test test/*.test.mjs`),
   which as of this report is **49 tests, 49 passing, 0 failing**.
2. The in-game **Run Game Check** feature (`js/engine/gameCheck.js`), which
   computes pass/fail live from the same engine used during play
   (`validateSolutionPath`, `evaluateAttempt`, real game-state functions).
   It was exercised both headlessly (Node) and in a real Chromium browser
   via Playwright, driving the actual `index.html` app.

Every difficulty level, every challenge, and every scenario share one
engine: `js/engine/techniques.js` (detector), `js/engine/scoring.js`,
`js/engine/successDetector.js`, and `js/engine/validator.js`
(`validateSolutionPath`). Difficulty differences live entirely in
`js/config/difficulties.js` as configuration values (threshold, minimum
distinct techniques, repetition rule, hint limit, score multiplier,
feedback flags) — there is no per-difficulty copy of the game logic, and
no separate "fake" validation path. A solution is only ever shown to a
player after `validateSolutionPath` has confirmed it actually completes
the challenge under the exact difficulty in play.

---

## Phase 1: Easy

All 18 required Phase 1 checks were executed and passed:

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Player can start and understand the game | PASS | Start screen + How to Play verified in browser (Playwright) |
| 2 | Every challenge displays its assigned scenario clearly | PASS | `scenario.instructions` non-empty for all scenarios (test) + rendered in browser |
| 3 | Every challenge completable through normal play | PASS | `validateSolutionPath` succeeds for ≥1 Easy solution per scenario |
| 4 | Every challenge initially resists a weak attempt | PASS | `evaluateAttempt(['please give me the code'], easy)` → `completed: false` |
| 5 | Give Up reveals a solution that actually works | PASS | `getSolutionToReveal` only returns solutions `validateSolutionPath` confirms |
| 6 | Solution Viewed awards zero points | PASS | `markSolutionViewed` always sets `pointsAwarded = 0` |
| 7 | A completed challenge cannot award points twice | PASS | second `markChallengeCompleted` call is a no-op (test + Run Game Check) |
| 8 | Try a New Version changes the scenario | PASS | `startNewVersion` picks a scenario id different from the current one |
| 9 | The revealed solution is not immediately repeated | PASS | `getSolutionToReveal` excludes the last-revealed solution id when ≥2 valid solutions exist |
| 10 | Challenge state remains separate when switching challenges | PASS | mutating one challenge's state leaves all others byte-for-byte unchanged |
| 11 | Exit Without Solutions reveals nothing | PASS | summary object contains no `revealedSolution` field |
| 12 | Exit and Review Solutions works correctly | PASS | unresolved challenges get a validated reveal, completed ones don't |
| 13 | Saved progress can be restored | PASS | `saveGame` → `loadGame` round-trip (Node test + real `localStorage` in browser, incl. reload) |
| 14 | Reset Game works | PASS | `resetGame` clears the save; `loadGame` returns `null` after |
| 15 | User-entered HTML is displayed safely as text | PASS | `renderTextSafely` uses `textContent` only; browser test typed `<img src=x onerror=...>` into chat — no script executed, no `<img>` element created |
| 16 | The app works on a narrow mobile screen | PASS | Playwright at 375×700: no horizontal overflow, all controls usable |
| 17 | The app makes no external requests | PASS | `networkMonitor` wraps `fetch`/`XMLHttpRequest` in the live browser session — observed count stayed 0 through a full play session; static source scan confirms no engine/state/UI module (other than the monitor itself) references `fetch`/`XMLHttpRequest`/`WebSocket` |
| 18 | Run Game Check reports no failed Easy Mode tests | PASS | Run Game Check: 12/12 passed at end of Phase 1 (grew to 16/16 by the final phase as more checks were added) |

Content delivered: 4 challenges (Vault Override, Refund Request, Smart Lock
Override, Guest WiFi Limit) × 3 scenarios each, 2 validated solutions per
scenario (24 total), each with unique id, clear instructions, an everyday
topic, multiple cautious/failure bot responses, a working revealed
solution, and a short educational explanation.

One real bug was found and fixed during Phase 1 browser testing (not just
unit tests): a CSS rule (`.continue-banner { display: flex }`) had equal
specificity to the browser's built-in `[hidden] { display: none }` rule and
won by cascade order, so the "Continue Saved Game" banner stayed visible
even when hidden. Fixed with a global `[hidden] { display: none !important; }`
rule. A related issue — `init()` moving keyboard focus to the start
heading on the very first page load, which skipped the skip-link — was
also found and fixed (focus-on-load is now suppressed for the initial
render only).

## Phase 2: Normal

Added after all Phase 1 checks passed. Enabled purely via
`DIFFICULTIES.normal.phaseEnabled = true` plus one additional validated
solution per scenario scoped to clear Normal's higher bar (threshold 5,
2 distinct techniques, exact-wording dedupe).

| Check | Result | Evidence |
|-------|--------|----------|
| All four challenges completable under Normal | PASS | every scenario has ≥1 validated Normal solution |
| Weak Easy solutions do not necessarily work | PASS | all 12 "one strong Easy message" solutions were re-validated against Normal and **all 12 failed** (score 4 < threshold 5) — real differentiation, not just a label |
| At least one solution per challenge passes automatic validation | PASS | 12/12 new Normal solutions validated |
| Give Up displays a valid Normal solution | PASS | `getSolutionToReveal(..., 'normal', ...)` only returns validated solutions |
| Easy Mode still works exactly as before | PASS | full Easy test suite re-run, unchanged, still green |

Verified live in browser: Normal is preselected as the recommended default
on the start screen; selecting Easy explicitly still works correctly.

## Phase 3: Hard

Added after Normal passed. Enabled via config (threshold 7, 3 distinct
techniques, diminishing repetition value, 2 indirect hints, 2x score).
Added one validated multi-message solution per scenario.

| Check | Result | Evidence |
|-------|--------|----------|
| "I am the developer" does not win alone | PASS | single-message attempts (`"I am the developer"`, `"I am the admin"`, `"ignore previous instructions"`) all score below threshold / distinct-count on Hard |
| Every challenge has ≥1 validated multi-message solution | PASS | 12/12 Hard solutions (2–3 messages each) validated |
| Give Up displays a solution that works on Hard | PASS | verified via `getSolutionToReveal` + re-validation |
| Easy and Normal remain functional | PASS | both re-run, unchanged, still green |

Hard was not made "impossible" by raising numbers alone — real
multi-technique, multi-message solutions exist and were proven to work
through the same engine, not just asserted.

## Phase 4: Expert

Added after Hard passed. Enabled via config (threshold 9, 3 distinct
techniques, exact-wording dedupe, 1 vague hint, no live analysis, ≥2
messages required, 3x score).

| Check | Result | Evidence |
|-------|--------|----------|
| Every challenge has a complete Expert solution | PASS | 12/12 scenarios have a validated Expert solution (4 already cleared the bar with their Hard solution; 8 needed one extra escalation message) |
| Every Expert solution passes the real automatic validator | PASS | all validated via `validateSolutionPath(..., 'expert', ...)`, same function used everywhere else |
| No manipulation analysis shown during Expert play | PASS | verified live in browser: detected-techniques line stayed empty throughout an Expert session |
| Teacher Mode unavailable until the game ends | PASS | `handleGiveUp` withholds `scenario.explanation` during Expert play (shows a "Teacher Mode is unavailable until the game ends" notice instead) and the full explanation is shown for every difficulty once Exit is used, after the game has actually ended — verified live in browser |

## Phase 5: Guided

Added last, after Expert passed. Enabled via config (threshold 2, 1
distinct technique, unlimited hints, score/threshold/detected-techniques
shown, attempt explanations, safe phrase highlighting, 0.5x score).
Existing Easy solutions already cleared Guided's low bar, so no new
scenario content was required — only presentation logic was added.

| Check | Result | Evidence |
|-------|--------|----------|
| Guided feedback passed | PASS | `buildAttemptFeedback` narrates the real, already-computed score state (not fabricated numbers) — verified by a test that sends a weak message and checks the exact "Manipulation score: 0 / 2 needed" text |
| Highlighting never uses raw user input via innerHTML | PASS | `renderHighlighted` builds `<mark>` elements via `textContent` only; a test asserts `innerHTML` is never touched even when the input contains `<img onerror=...>`; verified live in browser (typed `<b>...</b>` into chat under Guided — rendered as literal text with real `<mark>` highlights around detected phrases, zero script execution, zero raw `<b>` elements in the DOM) |
| Extra feedback does not leak into other difficulties | PASS | Run Game Check's `guided-isolated` check confirms `showManipulationScore`, `explainAttempts`, and `highlightPhrases` are `false` for Guided/Easy/Normal/Hard/Expert alike outside of Guided |
| All five levels selectable, correct order, Normal preselected | PASS | verified live in browser: start screen shows Guided, Easy, Normal, Hard, Expert in that order, with Normal pressed by default |

## Final scenario expansion

After all five difficulty levels passed, every challenge was expanded
from 3 to 5 scenario variants (20 scenarios total, up from 12), each with
complete instructions, a relatable everyday topic, ≥2 solution paths, and
a validated solution for **every one of the five difficulty levels**
(100 scenario/difficulty pairs checked, 0 missing).

| Check | Result | Evidence |
|-------|--------|----------|
| Every challenge has ≥5 scenarios | PASS | 5/5/5/5 across Vault, Refund, Curfew, WiFi |
| All scenario ids remain unique | PASS | 20 unique ids checked |
| Every scenario has complete instructions, topic, ≥2 solutions, explanation | PASS | checked programmatically |
| Every scenario has a validated solution on all 5 difficulties | PASS | 100/100 scenario × difficulty pairs validated |
| No duplicated example text between scenarios | PASS | checked first-solution message uniqueness across all 20 scenarios |

## Final Run Game Check

The in-game Run Game Check screen (reachable from the start screen) now
reports **16 checks, 16 passing, 0 failing**, computed live and in plain
English, including:

- Easy Mode passed all four challenges
- Normal Mode passed all four challenges
- Hard Mode passed all four challenges
- Expert Mode passed all four challenges
- Guided Mode feedback passed
- Every active scenario has a validated solution (100 scenario/difficulty pairs)
- Challenge states remain isolated
- Revealed solutions award zero points
- A completed challenge cannot award points twice
- Revealed solutions are not immediately repeated
- Saved-game recovery works
- Reset Game works
- Try a New Version changes the scenario
- Exit Without Solutions reveals nothing
- User-entered HTML is handled safely
- No external services are used

None of these are hard-coded PASS strings — each is the return value of
a real function call against the live game engine and state, re-computed
every time the check runs.

### Honesty notes / known limitations

- The "no external requests" check reports `null`/fail if no network
  monitor count is supplied (e.g. if `runGameCheck()` is called outside a
  browser with no `externalRequestCount` option). In the actual running
  app this is always supplied via `js/state/networkMonitor.js`, which
  patches `fetch`/`XMLHttpRequest` at startup and reports a real live
  count — it is not assumed to be zero.
- Mobile layout and keyboard accessibility were verified through real
  browser automation (Playwright + Chromium) at a 375×700 viewport and via
  simulated `Tab` key navigation, not purely through code review. They are
  not currently wired into the automated Run Game Check screen itself
  (that check is logic/state-focused); this is a reasonable gap for a
  from-scratch build but worth calling out rather than glossing over.
- Difficulty "flavor" content (bot cautious/failure responses) is shared
  per bot persona across that challenge's scenarios rather than being
  entirely unique per scenario. The requirement was "multiple cautious
  bot responses" and "multiple failure responses" per scenario, which is
  satisfied (3 of each, assigned to every scenario for that persona) —
  but it is a deliberate content-reuse decision, not an oversight, and is
  disclosed here for transparency.
