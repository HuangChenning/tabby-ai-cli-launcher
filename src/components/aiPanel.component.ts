import { Component, Input, Output, EventEmitter } from '@angular/core'
import { Subscription } from 'rxjs'
import { ConfigService } from 'tabby-core'
import { BaseTerminalTabComponent } from 'tabby-terminal'
import { ClaudeAgentService, ClaudeStreamEvent } from '../chat/claudeAgent.service'
import { getTabCwd, getTabScrollback } from '../chat/terminalContext'

interface ChatMessage {
    role: 'user' | 'assistant'
    text: string
    isError?: boolean
}

@Component({
    selector: 'ai-cli-panel',
    template: `
        <div class="panel-header">
            <span>AI CLI</span>
            <button class="btn btn-link btn-sm" (click)="close()" title="关闭">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="panel-messages">
            <div class="msg" *ngFor="let m of messages" [class.msg-user]="m.role === 'user'"
                [class.msg-error]="m.isError">
                <pre>{{ m.text || (isLoading && m === lastMessage ? '…' : '') }}</pre>
            </div>
        </div>
        <div class="panel-input">
            <textarea rows="2" [(ngModel)]="inputText" placeholder="问 claude 关于当前会话的问题…"
                (keydown.enter)="onEnter($event)" [disabled]="isLoading"></textarea>
            <button class="btn btn-secondary btn-sm" (click)="stop()" *ngIf="isLoading">
                <i class="fas fa-stop"></i>
            </button>
            <button class="btn btn-primary btn-sm" (click)="send()" *ngIf="!isLoading"
                [disabled]="!inputText.trim()">
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>
    `,
    styles: [`
        :host {
            display: flex;
            flex-direction: column;
            border-left: 1px solid var(--theme-border, rgba(255,255,255,.1));
            font-size: 13px;
        }
        .panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: .5rem .75rem;
            font-weight: 600;
            border-bottom: 1px solid var(--theme-border, rgba(255,255,255,.1));
        }
        .panel-messages {
            flex: 1 1 auto;
            overflow-y: auto;
            padding: .5rem .75rem;
        }
        .msg {
            margin-bottom: .75rem;
        }
        .msg pre {
            white-space: pre-wrap;
            word-break: break-word;
            font-family: inherit;
            margin: 0;
        }
        .msg-user pre {
            opacity: .75;
        }
        .msg-error pre {
            color: #ff615a;
        }
        .panel-input {
            display: flex;
            gap: .5rem;
            padding: .5rem .75rem;
            border-top: 1px solid var(--theme-border, rgba(255,255,255,.1));
        }
        .panel-input textarea {
            flex: 1 1 auto;
            resize: none;
        }
    `],
})
export class AiCliPanelComponent {
    @Input() tab!: BaseTerminalTabComponent<any>
    @Output() closed = new EventEmitter<void>()

    messages: ChatMessage[] = []
    inputText = ''
    isLoading = false
    lastMessage: ChatMessage | null = null

    private sessionId: string | null = null
    private sub: Subscription | null = null

    constructor (
        private config: ConfigService,
        private agent: ClaudeAgentService,
    ) { }

    onEnter (event: Event): void {
        const keyboardEvent = event as KeyboardEvent
        if (!keyboardEvent.shiftKey) {
            keyboardEvent.preventDefault()
            void this.send()
        }
    }

    async send (): Promise<void> {
        const text = this.inputText.trim()
        if (!text || this.isLoading) {
            return
        }
        this.inputText = ''
        this.messages.push({ role: 'user', text })

        const cwd = await getTabCwd(this.tab)
        const contextLines = this.config.store.aiCliLauncher?.chat?.contextLines ?? 50
        const scrollback = getTabScrollback(this.tab, contextLines)

        const prompt = scrollback
            ? `以下是当前终端会话最近的输出,供参考背景(不代表用户问题本身):\n\n${scrollback}\n\n用户的问题: ${text}`
            : text

        const assistantMsg: ChatMessage = { role: 'assistant', text: '' }
        this.messages.push(assistantMsg)
        this.lastMessage = assistantMsg
        this.isLoading = true

        this.sub = this.agent.send(prompt, { cwd, resume: this.sessionId }).subscribe({
            next: (event: ClaudeStreamEvent) => {
                if (event.session_id) {
                    this.sessionId = event.session_id
                }
                if (event.type === 'assistant') {
                    const chunk = (event.message?.content ?? [])
                        .filter(p => p.type === 'text' && p.text)
                        .map(p => p.text)
                        .join('')
                    if (chunk) {
                        assistantMsg.text += (assistantMsg.text ? '\n' : '') + chunk
                    }
                } else if (event.type === 'result' && event.is_error && !assistantMsg.text) {
                    assistantMsg.text = event.result ?? '(no response)'
                    assistantMsg.isError = true
                }
            },
            error: (err) => {
                assistantMsg.text = assistantMsg.text || `启动 claude 失败: ${err?.message ?? err}`
                assistantMsg.isError = true
                this.isLoading = false
            },
            complete: () => {
                this.isLoading = false
            },
        })
    }

    stop (): void {
        this.agent.cancel()
        this.isLoading = false
    }

    close (): void {
        this.agent.cancel()
        this.sub?.unsubscribe()
        this.closed.emit()
    }
}
