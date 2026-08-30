# tabby-ai-cli-launcher

[中文文档](./README.zh-CN.md)

A [Tabby](https://github.com/Eugeny/tabby) plugin that launches locally
installed AI CLI tools (Claude Code, Codex, or any other command-line agent)
in a new tab, with a settings page to configure the list.

## Features

- One toolbar button ("AI CLI") that opens Tabby's built-in fuzzy selector
  (the same one behind the profile picker) listing your configured tools.
  Picking one opens it in a new local terminal tab.
- A settings page (Settings → AI CLI) to add, edit, remove, and test-launch
  tools — no YAML editing required.
- Each tool launches through your login shell (`$SHELL --login -i -c`), so it
  sees the same `PATH` as your interactive terminal (important for tools
  installed via nvm/fnm/asdf or a package manager, since Tabby itself is a GUI
  app and does not inherit your shell's `PATH` when launched from the Dock).

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
