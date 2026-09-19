# Lazy Downward Task Traversal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make both BOSS bulk actions start from the selected conversation, continue lazily downward, preserve safety checks, skip per-conversation errors, and wait 300ms after successful sends.

**Architecture:** Add a pure selector module for the next unprocessed downward target and integrate it into `content.js`. The content script will process the selected item immediately, lock one successor at a time, and scroll only when no successor is currently rendered. Existing activation, readiness, confirmation, retry, exclusion, and stop logic remains authoritative.

**Tech Stack:** Manifest V3 Chrome extension, browser JavaScript IIFE modules, Node built-in `node:test`.

---

### Task 1: Pure downward selector and timing constant

**Files:**
- Create: `BossMHelper/downward-task.js`
- Create: `BossMHelper/tests/downward-task.test.js`
- Modify: `BossMHelper/manifest.json`

- [ ] Write tests for: selected start included; first unprocessed item below current selected; duplicate/processed keys skipped; bottom/missing current returns null; delay constant equals 300.
- [ ] Run `node --test BossMHelper/tests/downward-task.test.js` and observe the expected missing-module failure.
- [ ] Implement `nextDownwardTarget(entries, currentKey, processedKeys)` and `POST_SEND_DELAY_MS = 300` in an IIFE module exporting `BossAssistantDownwardTask` and CommonJS API.
- [ ] Add `downward-task.js` before `content.js` in the manifest content script list.
- [ ] Re-run the focused test; expect all tests passing.
- [ ] Commit as `feat: add downward task selector`.

### Task 2: Lazy traversal integration with error isolation

**Files:**
- Modify: `BossMHelper/content.js`
- Modify: `BossMHelper/tests/downward-task.test.js`

- [ ] Add a regression test proving a next target can be retained independently before list order changes.
- [ ] Run the focused test and observe failure before implementation.
- [ ] Import `nextDownwardTarget` and `POST_SEND_DELAY_MS`.
- [ ] Add a helper that returns unique visible conversation entries with their current scroll position.
- [ ] Add a helper that selects the first unprocessed visible successor; if none is visible, advances by `nextCollectionScrollTop`, waits 300ms, and retries without ever resetting scrollTop to zero or pre-scanning the whole list.
- [ ] Replace the two full-scan loops with a shared lazy runner used by wake and follow-up modes. It must include the selected conversation, mark each target processed before activation, preserve exclusions and follow-up eligibility, and wait `POST_SEND_DELAY_MS` after each success.
- [ ] Catch errors per target, increment failed, deduplicate failure reasons, emit progress, wait 500ms, and continue. If the successor cannot be safely locked, end after the current target with a reported failure; never fall back to top/full scan.
- [ ] Preserve `TASK_COMPLETE`, stop semantics, activation checks, readiness checks, send confirmation, and retry behavior.
- [ ] Run focused regression tests and commit as `feat: process selected conversations downward lazily`.

### Task 3: Popup copy and full verification

**Files:**
- Modify: `BossMHelper/popup.html`
- Modify: `BossMHelper/popup-controls.js`
- Create: `BossMHelper/tests/popup-copy.test.js`

- [ ] Add a failing test checking the popup says the task starts from the selected conversation and the running status says 0.3 seconds.
- [ ] Run it and observe the expected failure against old “全部/1秒” copy.
- [ ] Update both bulk-action labels and status messages to describe selected-to-downward processing and 0.3-second send spacing.
- [ ] Run `node --test BossMHelper/tests/*.test.js` and expect zero failures.
- [ ] Validate manifest JSON and run `git diff --check`.
- [ ] Commit as `feat: describe selected downward message tasks`.

### Final review

- [ ] Inspect the final diff for accidental top resets, full pre-scans, removed safety checks, or any batch-delete command.
- [ ] Run the complete test suite and manifest validation again immediately before reporting completion.
