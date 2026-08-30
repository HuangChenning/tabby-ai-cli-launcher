import { Component, Input, Output, EventEmitter } from '@angular/core'
import { Subscription } from 'rxjs'
import { ConfigService } from 'tabby-core'
import { BaseTerminalTabComponent } from 'tabby-terminal'
import { AgentRunnerService } from '../chat/agentRunner.service'
import { ADAPTERS_BY_COMMAND, NormalizedEvent } from '../chat/agentAdapters'
import { AiCliTool, DEFAULT_TOOLS } from '../api'
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
        <div class="panel-picker">
            <select class="form-control form-control-sm" [(ngModel)]="selectedToolId"
                (ngModelChange)="onToolChange()" [disabled]="isLoading">
                <option *ngFor="let t of tools" [value]="t.id">{{ t.name }}</option>
            </select>
            <input class="form-control form-control-sm" [(ngModel)]="model"
                placeholder="模型(留空用默认)" [disabled]="isLoading">
        </div>
        <div class="panel-messages">
            <div class="msg" *ngFor="let m of messages" [class.msg-user]="m.role === 'user'"
                [class.msg-error]="m.isError">
                <pre>{{ m.text || (isLoading && m === lastMessage ? '…' : '') }}</pre>
            </div>
            <div class="msg-hint" *ngIf="!adapterAvailable">
                "{{ selectedToolName }}" 还没有对应的对话适配器,换一个工具试试。
            </div>
        </div>
        <div class="panel-input">
            <textarea rows="2" [(ngModel)]="inputText" placeholder="问问关于当前会话的问题…"
                (keydown)="onKeyDown($event)" (keyup)="$event.stopPropagation()"
                [disabled]="isLoading"></textarea>
            <button class="btn btn-secondary btn-sm" (click)="stop()" *ngIf="isLoading">
                <i class="fas fa-stop"></i>
            </button>
            <button class="btn btn-primary btn-sm" (click)="send()" *ngIf="!isLoading"
                [disabled]="!inputText.trim() || !adapterAvailable">
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
        .panel-picker {
            display: flex;
            gap: .5rem;
            padding: .5rem .75rem;
            border-bottom: 1px solid var(--theme-border, rgba(255,255,255,.1));
        }
        .panel-picker select {
            flex: 0 0 auto;
            width: 40%;
        }
        .panel-picker input {
            flex: 1 1 auto;
            min-width: 0;
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
        .msg-hint {
            opacity: .6;
            font-style: italic;
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
    model = ''
    selectedToolId = ''

    private sessionId: string | null = null
    private sub: Subscription | null = null

    constructor (
        private config: ConfigService,
        private runner: AgentRunnerService,
    ) {
        const first = this.tools[0]
        if (first) {
            this.selectedToolId = first.id
        }
    }

    get tools (): AiCliTool[] {
        const tools = this.config.store.aiCliLauncher?.tools
        return Array.isArray(tools) && tools.length > 0 ? tools : DEFAULT_TOOLS
    }

    get selectedTool (): AiCliTool | undefined {
        return this.tools.find(t => t.id === this.selectedToolId)
    }

    get selectedToolName (): string {
        return this.selectedTool?.name ?? this.selectedToolId
    }

    get adapterAvailable (): boolean {
        const tool = this.selectedTool
        return !!tool && !!ADAPTERS_BY_COMMAND[tool.command]
    }

    onToolChange (): void {
        // A different tool has its own, unrelated session store - starting
        // fresh avoids passing one tool's session id to another's --resume.
        this.messages = []
        this.lastMessage = null
        this.sessionId = null
        this.runner.cancel()
        this.isLoading = false
    }

    /**
     * Every keystroke here must stop propagating: xterm and Tabby's global
     * hotkey service both listen for keydown on ancestor elements (xterm to
     * feed its own PTY, the hotkey service via a document-level listener to
     * match shortcuts), and either can swallow the event or steal focus back
     * to the terminal before a single character lands in this textarea.
     */
    onKeyDown (event: KeyboardEvent): void {
        event.stopPropagation()

        if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
            event.preventDefault()
            void this.send()
        }
    }

    async send (): Promise<void> {
        const text = this.inputText.trim()
        const tool = this.selectedTool
        const adapter = tool && ADAPTERS_BY_COMMAND[tool.command]
        if (!text || this.isLoading || !tool || !adapter) {
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

        this.sub = this.runner.run(adapter, {
            prompt,
            cwd,
            resume: this.sessionId,
            model: this.model.trim() || undefined,
        }).subscribe({
            next: (event: NormalizedEvent) => {
                if (event.sessionId) {
                    this.sessionId = event.sessionId
                }
                if (event.kind === 'text' && event.text) {
                    assistantMsg.text += (assistantMsg.text ? '\n' : '') + event.text
                } else if (event.kind === 'error' && !assistantMsg.text) {
                    assistantMsg.text = event.text ?? '(no response)'
                    assistantMsg.isError = true
                }
            },
            error: (err) => {
                assistantMsg.text = assistantMsg.text || `启动失败: ${err?.message ?? err}`
                assistantMsg.isError = true
                this.isLoading = false
            },
            complete: () => {
                this.isLoading = false
            },
        })
    }

    stop (): void {
        this.runner.cancel()
        this.isLoading = false
    }

    close (): void {
        this.runner.cancel()
        this.sub?.unsubscribe()
        this.closed.emit()
    }
}
