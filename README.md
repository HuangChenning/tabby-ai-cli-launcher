<img src="assets/readme/hero.svg" alt="tabby-ai-cli-launcher — launch local AI CLIs from the toolbar, chat with Claude about the tab you're in" width="100%">

[中文文档](./README.zh-CN.md) · MIT · [Tabby](https://github.com/Eugeny/tabby) plugin

## What it is

A [Tabby](https://github.com/Eugeny/tabby) plugin with two independent
features: a toolbar button that launches locally installed AI CLI tools
(Claude Code, Codex, or any other command-line agent) in a new tab, and a
chat panel docked to the *current* terminal tab, backed by `claude -p`.

## How it works

<img src="assets/readme/mechanism.svg" alt="Quick launch: toolbar button opens a fuzzy selector of configured tools, which opens a new terminal tab via the login shell. AI panel: a second toolbar button attaches a chat panel to the active terminal tab, which runs claude -p --output-format stream-json with the tab's cwd and scrollback as context." width="100%">

**Quick launch.** One toolbar button ("AI CLI") opens Tabby's built-in fuzzy
selector (the same one behind the profile picker) listing your configured
tools. Picking one opens it in a new, independent local terminal tab — no
relation to whatever tab you were on. A settings page (Settings → AI CLI)
lets you add, edit, remove, and test-launch tools, no YAML editing required.

**AI panel.** A second toolbar button opens a chat panel docked to the side
of the tab you're actually looking at, backed by `claude -p --output-format
stream-json` — Claude Code's non-interactive mode. (The regular interactive
`claude` is a full TUI with an alternate screen buffer; there's no reliable
way to turn that into chat bubbles, which is why this exists as a separate
mode rather than embedding the interactive terminal.) Every message is sent
together with that tab's working directory and recent scrollback, so you can
ask things like "what did that error mean" without pasting it in. Each
terminal tab gets its own independent panel and conversation.

Both features launch commands through your login shell (`$SHELL --login -i
-c`), so they see the same `PATH` as your interactive terminal — important
for tools installed via nvm/fnm/asdf or a package manager, since Tabby itself
is a GUI app and does not inherit your shell's `PATH` when launched from the
Dock.

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

The AI panel reads two more settings from the same config namespace
(`aiCliLauncher.chat` in the raw config file): `contextLines` (how much
scrollback to attach, default `50`) and `panelWidthPercent` (default `38`).

## Development

```bash
npm install
npm run build   # or: npm run watch
```

Then copy (or symlink) this folder into Tabby's `plugins/node_modules/`
and restart Tabby.

## Limitations

- The AI panel backend is hardcoded to `claude`; it doesn't (yet) read the
  same tool list as the launcher.
- `claude` needs to already be logged in — the panel surfaces whatever error
  the CLI prints (including an auth prompt) rather than handling login itself.
- Assumes a POSIX login shell (`$SHELL`, `--login -i -c`); untested on
  Windows, where that flag combination doesn't apply.
- Each chat bubble fills in per completed message, not token-by-token —
  `--include-partial-messages` isn't wired up yet.
- Panel conversations live in memory only. Closing the tab or restarting
  Tabby drops the chat history (though the underlying `claude` session is
  still resumable from the CLI itself via `claude --resume`).

## License

MIT
