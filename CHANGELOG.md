# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Agent picker in the AI panel: a dropdown to switch between the configured
  tools (`claude`, `codex`, `agent`/Cursor Agent, `pi` by default), via a
  per-tool `AgentAdapter` (`src/chat/agentAdapters.ts`) instead of
  hardcoding `claude`. Only the `claude` adapter's chat protocol has been
  run against real output; `codex`, `agent`, and `pi` are implemented from
  their `--help` text and are unverified — see the README's Limitations
  section.
- Model picker: a dropdown of real models for `agent` and `pi` (fetched via
  each CLI's own `--list-models`, verified against real output) and a
  curated list of documented aliases for `claude` (`--help` doesn't offer a
  listing command); falls back to a free-text field for tools with neither.
- Switching the panel's agent starts a new conversation and re-fetches that
  tool's model list (different tools don't share a session store or model
  catalog).

### Fixed

- Typing in the panel's textarea did nothing: xterm and Tabby's global
  hotkey service both react to keydown events bubbling up from anywhere in
  the tab, including the injected panel, and could swallow the keystroke or
  steal focus back to the terminal. Every keydown in the textarea now stops
  propagation, and Enter is ignored while an IME composition is in progress.
- Same issue for mouse events: clicking the panel's dropdowns or message
  list could bubble into the same terminal-level handlers. Click, mousedown,
  dblclick, and wheel now stop propagating from the panel's root element too.

## [0.1.0] - 2026-08-30

### Added

- Toolbar button ("AI CLI") that opens a fuzzy selector listing configured
  local AI CLI tools and launches the chosen one in a new terminal tab.
- Settings page (Settings → AI CLI) to add, edit, remove, and test-launch
  tools.
- Second toolbar button that docks a chat panel to the side of the active
  terminal tab, backed by `claude -p --output-format stream-json`.
- Per-tab conversation state: each terminal tab gets its own independent
  panel and `--resume` session.
- Automatic context: each chat message is sent together with the tab's
  working directory and recent scrollback.
- Assignable hotkey (`ai-cli-launcher.toggle-panel`, no default binding) to
  toggle the panel for the focused tab.
- Both features spawn commands through the login shell (`$SHELL --login -i
  -c`) so they see the same `PATH` as an interactive terminal.
