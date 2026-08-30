# tabby-ai-cli-launcher

[English](./README.md)

一个 [Tabby](https://github.com/Eugeny/tabby) 插件,用来在新标签页里一键启动本地已安装的
AI 命令行工具(Claude Code、Codex,或任何其他命令行 Agent),并提供设置页面来配置工具列表。

## 功能

- 工具栏上的一个"AI CLI"图标按钮,点击后弹出 Tabby 内置的模糊搜索选择器(和 Profile
  选择器共用同一套 UI),列出你配置的工具,选中后会在新的本地终端标签页里启动。
- 一个设置页(设置 → AI CLI),可以直接增删改工具、并一键试跑,不需要手动编辑 YAML。
- 每个工具都会经过登录 shell(`$SHELL --login -i -c`)启动,这样它能拿到和交互式终端
  一致的 `PATH`。这一点很重要:Tabby 本身是从 Dock/Finder 启动的 GUI 程序,不会继承
  ~/.zshrc 等 rc 文件里通过 nvm/fnm/asdf 或包管理器设置的 `PATH`。

## 安装

通过 Tabby 内置插件管理器:**设置 → 插件**,搜索 `ai-cli-launcher`,点击**安装**,
然后重启 Tabby。

或者手动安装:

```bash
cd "$(tabby-config-path)/plugins" 2>/dev/null || cd ~/.config/tabby/plugins
npm install tabby-ai-cli-launcher
```

(macOS 上插件目录是 `~/Library/Application Support/tabby/plugins`。)

安装后需要重启 Tabby——插件只在启动时被扫描发现。

## 配置

打开**设置 → AI CLI**,每一行是一个工具:

| 字段 | 说明 |
|---|---|
| 显示名称 | 在工具栏选择器里显示的名字 |
| 命令 | 可执行文件名或路径,例如 `claude` |
| 参数 | 额外参数,空格分隔 |
| 工作目录 | 留空则跟随当前标签页的工作目录 |

默认包含 `claude`、`codex`、`agent`、`pi` 四项,按你机器上实际安装的工具增删/修改即可。

## 开发

```bash
npm install
npm run build   # 或者: npm run watch
```

然后把这个目录拷贝(或软链接)进 Tabby 的 `plugins/node_modules/` 并重启 Tabby。

## 许可证

MIT
