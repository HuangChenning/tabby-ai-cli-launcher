# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
