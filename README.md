# tabby-ai-cli-launcher

[中文文档](./README.zh-CN.md)

A [Tabby](https://github.com/Eugeny/tabby) plugin that launches locally
installed AI CLI tools (Claude Code, Codex, or any other command-line agent)
in a new tab, with a settings page to configure the list.

## Features

**Quick launch.** One toolbar button ("AI CLI") that opens Tabby's built-in
fuzzy selector (the same one behind the profile picker) listing your
configured tools. Picking one opens it in a new, independent local terminal
tab. A settings page (Settings → AI CLI) lets you add, edit, remove, and
test-launch tools — no YAML editing required.

**AI panel.** A second toolbar button opens a chat panel docked to the side
of the *current* terminal tab, backed by `claude -p --output-format
stream-json` (Claude Code's non-interactive mode — the regular interactive
`claude` is a full TUI and can't be turned into chat bubbles). Every message
is sent together with that tab's working directory and recent scrollback, so
you can ask things like "what did that error mean" without pasting it in.
Each terminal tab gets its own independent panel and conversation.

Both features launch commands through your login shell (`$SHELL --login -i
-c`), so they see the same `PATH` as your interactive terminal (important for
tools installed via nvm/fnm/asdf or a package manager, since Tabby itself is
a GUI app and does not inherit your shell's `PATH` when launched from the
Dock).

## Install

Via Tabby's built-in plugin manager: **Settings → Plugins**, search for
`ai-cli-launcher`, click **Install**, then restart Tabby.

Or manually:

```bash
cd "$(tabby-config-path)/plugins" 2>/dev/null || cd ~/.config/tabby/plugins
npm install tabby-ai-cli-launcher
```

(On macOS the plugins folder is
`~/Library/Application Support/tabby/plugins`.)

Restart Tabby afterwards — plugins are only discovered at startup.

## Configuration

Open **Settings → AI CLI**. Each row is one tool:

| Field | Meaning |
|---|---|
| Name | Shown in the toolbar picker |
| Command | Executable name or path, e.g. `claude` |
| Args | Space-separated extra arguments |
| Working directory | Leave empty to inherit the active tab's cwd |

Defaults to `claude`, `codex`, `agent`, and `pi` — edit or remove any of them
to match what you actually have installed.

## Development

```bash
npm install
npm run build   # or: npm run watch
```

Then copy (or symlink) this folder into Tabby's `plugins/node_modules/`
and restart Tabby.

## License

MIT
