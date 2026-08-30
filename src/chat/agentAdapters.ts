export interface AgentRunOptions {
    prompt: string
    model?: string
    /** Continuity token echoed back by a previous NormalizedEvent.sessionId, or null on the first turn. */
    resume?: string | null
    cwd?: string | null
}

export interface NormalizedEvent {
    kind: 'text' | 'error' | 'ignore'
    text?: string
    sessionId?: string
}

export interface ModelOption {
    /** The exact string to pass as --model. */
    id: string
    label: string
}

export interface AgentAdapter {
    /** Matches AiCliTool.command (e.g. 'claude') so a configured tool can be mapped to its adapter. */
    command: string
    /** Argv passed to `command`, not including the command name itself. */
    buildArgs(opts: AgentRunOptions): string[]
    /** Parses one already-JSON.parse()'d line of the tool's stdout. */
    parseEvent(json: any): NormalizedEvent
    /** Hardcoded choices for a CLI that documents its model aliases but has no listing command. */
    staticModels?: ModelOption[]
    /** Argv to list this tool's available models at runtime (e.g. `['--list-models']`). */
    listModelsArgs?(): string[]
    /** Parses the raw (non-JSON) stdout of listModelsArgs(). */
    parseModelList?(stdout: string): ModelOption[]
}

function textFrom (...candidates: unknown[]): string | undefined {
    for (const c of candidates) {
        if (typeof c === 'string' && c.length > 0) {
            return c
        }
    }
    return undefined
}

/**
 * Verified against a real `claude -p ... --output-format stream-json
 * --verbose` run (see the commit history of this file's predecessor,
 * claudeAgent.service.ts) - the only adapter below with an empirically
 * confirmed wire format. The other three are inferred from `--help` output
 * and need to be checked against the real thing inside Tabby.
 */
export const claudeAdapter: AgentAdapter = {
    command: 'claude',
    buildArgs ({ prompt, model, resume }) {
        const args = ['-p', prompt, '--output-format', 'stream-json', '--verbose']
        if (model) {
            args.push('--model', model)
        }
        if (resume) {
            args.push('--resume', resume)
        }
        return args
    },
    parseEvent (json) {
        if (json.type === 'assistant') {
            const text = (json.message?.content ?? [])
                .filter((p: any) => p?.type === 'text' && p.text)
                .map((p: any) => p.text)
                .join('')
            return { kind: text ? 'text' : 'ignore', text, sessionId: json.session_id }
        }
        if (json.type === 'result' && json.is_error) {
            return { kind: 'error', text: json.result, sessionId: json.session_id }
        }
        return { kind: 'ignore', sessionId: json.session_id }
    },
    // claude has no `--list-models`; these are the aliases `claude --help`
    // documents for --model ('fable', 'opus', 'sonnet' verbatim - 'haiku'
    // added as the well-known fourth tier, slightly less certain than the
    // other three since it isn't spelled out in the truncated help text seen
    // while building this).
    staticModels: [
        { id: 'sonnet', label: 'sonnet (最新 Sonnet)' },
        { id: 'opus', label: 'opus (最新 Opus)' },
        { id: 'fable', label: 'fable (最新 Fable)' },
        { id: 'haiku', label: 'haiku (最新 Haiku)' },
    ],
}

/**
 * INFERRED, NOT VERIFIED. `codex exec --help` confirms `--json`, `-m/--model`,
 * and an `exec resume <id>` subcommand exist; the event shape below (a `msg`
 * envelope with `agent_message` / `agent_message_delta` / `error` types) is
 * this author's best recollection of Codex CLI's JSON event stream, not
 * something run against a logged-in `codex` in this environment. If it's
 * wrong, the panel will show whatever raw text sneaks through `textFrom`'s
 * fallback guesses, or an unhelpful error - report the actual output and
 * this gets corrected.
 */
export const codexAdapter: AgentAdapter = {
    command: 'codex',
    buildArgs ({ prompt, model, resume }) {
        const args = resume ? ['exec', 'resume', resume] : ['exec']
        args.push('--json')
        if (model) {
            args.push('-m', model)
        }
        args.push(prompt)
        return args
    },
    parseEvent (json) {
        const msg = json.msg ?? json
        const type = msg.type ?? json.type
        const sessionId = textFrom(json.session_id, json.conversation_id, msg.session_id)
        if (type === 'agent_message' || type === 'agent_message_delta') {
            const text = textFrom(msg.message, msg.delta, msg.text)
            return { kind: text ? 'text' : 'ignore', text, sessionId }
        }
        if (type === 'error') {
            return { kind: 'error', text: textFrom(msg.message, msg.error) ?? 'codex error', sessionId }
        }
        return { kind: 'ignore', sessionId }
    },
}

/**
 * Chat flow is INFERRED, NOT VERIFIED: `agent --help` (Cursor Agent) shows a
 * flag surface almost identical to Claude Code's (`-p --output-format
 * stream-json --resume --model`), which is why this reuses claudeAdapter's
 * event parser as a first guess rather than writing a new one blind.
 *
 * Model listing IS verified: `agent --list-models` really does run without
 * login and prints "Available models" followed by `id - label` lines.
 */
export const cursorAgentAdapter: AgentAdapter = {
    command: 'agent',
    buildArgs ({ prompt, model, resume }) {
        const args = ['-p', prompt, '--output-format', 'stream-json']
        if (model) {
            args.push('--model', model)
        }
        if (resume) {
            args.push('--resume', resume)
        }
        return args
    },
    parseEvent: claudeAdapter.parseEvent,
    listModelsArgs: () => ['--list-models'],
    parseModelList (stdout) {
        return stdout.split('\n')
            .map(line => line.trim())
            .filter(line => line.includes(' - '))
            .map(line => {
                const idx = line.indexOf(' - ')
                return { id: line.slice(0, idx).trim(), label: line.slice(idx + 3).trim() }
            })
    },
}

/**
 * Chat flow is INFERRED, NOT VERIFIED: `pi --help` documents `--mode json`
 * without ever calling it a *streaming* format the way the others say
 * "stream-json" - it may print one JSON object at the end instead of one
 * per line. agentRunner.service.ts covers that by also trying to parse
 * whatever is left in the buffer when the process exits.
 *
 * Model listing IS verified: `pi --list-models` really does run without
 * login and prints a `provider  model  context  max-out  thinking  images`
 * table; pi's own `--model` docs say it takes a `provider/id` pattern, hence
 * joining the first two columns with `/`.
 */
export const piAdapter: AgentAdapter = {
    command: 'pi',
    buildArgs ({ prompt, model, resume }) {
        const args = [prompt, '-p', '--mode', 'json']
        if (model) {
            args.push('--model', model)
        }
        if (resume) {
            args.push('--session-id', resume)
        }
        return args
    },
    parseEvent (json) {
        const sessionId = textFrom(json.session_id, json.sessionId)
        if (json.error || json.type === 'error') {
            return { kind: 'error', text: textFrom(json.error, json.message) ?? 'pi error', sessionId }
        }
        const text = textFrom(json.text, json.message, json.response, json.content)
        return { kind: text ? 'text' : 'ignore', text, sessionId }
    },
    listModelsArgs: () => ['--list-models'],
    parseModelList (stdout) {
        const lines = stdout.split('\n').filter(line => line.trim())
        // First line is the column header ("provider  model  context  ...").
        return lines.slice(1)
            .map(line => line.trim().split(/\s{2,}/))
            .filter(parts => parts.length >= 2 && parts[0] && parts[1])
            .map(([provider, model]) => ({ id: `${provider}/${model}`, label: `${provider}/${model}` }))
    },
}

export const ADAPTERS_BY_COMMAND: Record<string, AgentAdapter> = {
    [claudeAdapter.command]: claudeAdapter,
    [codexAdapter.command]: codexAdapter,
    [cursorAgentAdapter.command]: cursorAgentAdapter,
    [piAdapter.command]: piAdapter,
}
