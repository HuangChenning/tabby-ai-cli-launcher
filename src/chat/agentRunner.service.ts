import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { spawn, ChildProcess } from 'child_process'
import { AgentAdapter, AgentRunOptions, ModelOption, NormalizedEvent } from './agentAdapters'

/**
 * Tabby is a GUI app: launched from the Dock/Finder it does not inherit the
 * PATH set up by ~/.zshrc (fnm, ~/.local/bin, etc.), so the bare command
 * would fail with "command not found" even though it works in every
 * interactive terminal. Routing through `$SHELL --login -i -c` forces the
 * login shell to source its rc files (the `-i` is required because with
 * `-c` zsh/bash otherwise only run their *login* startup files, not .zshrc)
 * before exec'ing the target tool.
 */
function shellQuote (arg: string): string {
    return `'${arg.replace(/'/g, String.raw`'\''`)}'`
}

@Injectable({ providedIn: 'root' })
export class AgentRunnerService {
    private current: ChildProcess | null = null

    run (adapter: AgentAdapter, opts: AgentRunOptions): Observable<NormalizedEvent> {
        this.cancel()
        return new Observable<NormalizedEvent>(subscriber => {
            const shell = process.env.SHELL ?? '/bin/zsh'
            const args = [adapter.command, ...adapter.buildArgs(opts)]
            const commandLine = args.map(shellQuote).join(' ')
            const child = spawn(shell, ['--login', '-i', '-c', commandLine], {
                cwd: opts.cwd || undefined,
            })
            this.current = child

            let buffer = ''
            const emit = (line: string) => {
                const trimmed = line.trim()
                if (!trimmed) {
                    return
                }
                try {
                    subscriber.next(adapter.parseEvent(JSON.parse(trimmed)))
                } catch {
                    // Non-JSON noise (shell login banners, etc.) - ignore.
                }
            }

            child.stdout?.on('data', (chunk: Buffer) => {
                buffer += chunk.toString()
                let idx = buffer.indexOf('\n')
                while (idx >= 0) {
                    emit(buffer.slice(0, idx))
                    buffer = buffer.slice(idx + 1)
                    idx = buffer.indexOf('\n')
                }
            })

            let stderr = ''
            child.stderr?.on('data', (chunk: Buffer) => {
                stderr += chunk.toString()
            })

            child.on('error', err => subscriber.error(err))
            child.on('close', code => {
                if (this.current === child) {
                    this.current = null
                }
                // A tool that prints one JSON object with no trailing
                // newline (rather than NDJSON) would otherwise never get
                // parsed - try whatever's left in the buffer too.
                if (buffer.trim()) {
                    emit(buffer)
                }
                if (code !== 0 && code !== null && stderr.trim()) {
                    subscriber.error(new Error(stderr.trim()))
                } else {
                    subscriber.complete()
                }
            })

            return () => {
                if (!child.killed) {
                    child.kill()
                }
            }
        })
    }

    cancel (): void {
        if (this.current && !this.current.killed) {
            this.current.kill()
        }
        this.current = null
    }

    /**
     * Runs `command`'s model-listing command (if it has one) and parses its
     * plain-text stdout. Independent of `run()`/`cancel()` - this is a
     * short-lived one-shot process, not the long-running chat turn tracked
     * by `this.current`.
     */
    listModels (adapter: AgentAdapter): Promise<ModelOption[]> {
        if (adapter.staticModels) {
            return Promise.resolve(adapter.staticModels)
        }
        if (!adapter.listModelsArgs || !adapter.parseModelList) {
            return Promise.resolve([])
        }
        return new Promise(resolve => {
            const shell = process.env.SHELL ?? '/bin/zsh'
            const args = [adapter.command, ...adapter.listModelsArgs!()]
            const commandLine = args.map(shellQuote).join(' ')
            const child = spawn(shell, ['--login', '-i', '-c', commandLine])

            let stdout = ''
            child.stdout?.on('data', (chunk: Buffer) => {
                stdout += chunk.toString()
            })
            const finish = () => {
                try {
                    resolve(adapter.parseModelList!(stdout))
                } catch {
                    resolve([])
                }
            }
            child.on('error', () => resolve([]))
            child.on('close', finish)
        })
    }
}
