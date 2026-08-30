import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { spawn, ChildProcess } from 'child_process'

/**
 * One line of `claude -p --output-format stream-json` output. The schema
 * isn't in any package's typings (it's the CLI's own wire format), so this
 * only types the fields this plugin actually reads - verified against a real
 * `claude -p ... --output-format stream-json --verbose` run.
 */
export interface ClaudeStreamEvent {
    type: string
    session_id?: string
    message?: { content?: Array<{ type: string, text?: string }> }
    result?: string
    is_error?: boolean
}

function shellQuote (arg: string): string {
    return `'${arg.replace(/'/g, String.raw`'\''`)}'`
}

/**
 * Runs `claude -p` (Claude Code's non-interactive mode) through the login
 * shell - see launcher.service.ts for why. Interactive `claude` is a full TUI
 * (alternate screen buffer, cursor positioning) and can't be turned into chat
 * bubbles; `-p --output-format stream-json` is the CLI's own machine-readable
 * mode, built for exactly this.
 */
@Injectable({ providedIn: 'root' })
export class ClaudeAgentService {
    private current: ChildProcess | null = null

    send (prompt: string, opts: { cwd?: string | null, resume?: string | null }): Observable<ClaudeStreamEvent> {
        this.cancel()
        return new Observable<ClaudeStreamEvent>(subscriber => {
            const shell = process.env.SHELL ?? '/bin/zsh'
            const args = ['claude', '-p', prompt, '--output-format', 'stream-json', '--verbose']
            if (opts.resume) {
                args.push('--resume', opts.resume)
            }
            const commandLine = args.map(shellQuote).join(' ')
            const child = spawn(shell, ['--login', '-i', '-c', commandLine], {
                cwd: opts.cwd || undefined,
            })
            this.current = child

            let buffer = ''
            child.stdout?.on('data', (chunk: Buffer) => {
                buffer += chunk.toString()
                let idx = buffer.indexOf('\n')
                while (idx >= 0) {
                    const line = buffer.slice(0, idx).trim()
                    buffer = buffer.slice(idx + 1)
                    if (line) {
                        try {
                            subscriber.next(JSON.parse(line))
                        } catch {
                            // Non-JSON noise (shell login banners, etc.) - ignore.
                        }
                    }
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
}
