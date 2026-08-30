import { Component } from '@angular/core'
import { ConfigService } from 'tabby-core'
import { AiCliTool } from '../api'
import { AiCliLauncherService } from '../launcher.service'

@Component({
    template: `
        <div class="content-box">
            <h3>AI CLI Launcher</h3>
            <p class="text-muted">
                配置从工具栏 "AI CLI" 图标一键启动的本地命令行工具。启动时会经过登录 shell
                (<code>$SHELL --login -i</code>),以获得和交互终端一致的 PATH。
            </p>

            <div class="tool-row" *ngFor="let tool of tools; let i = index">
                <input class="form-control form-control-sm" [(ngModel)]="tool.name"
                    (ngModelChange)="save()" placeholder="显示名称">
                <input class="form-control form-control-sm" [(ngModel)]="tool.command"
                    (ngModelChange)="save()" placeholder="命令,如 claude">
                <input class="form-control form-control-sm" [ngModel]="getArgsString(tool)"
                    (ngModelChange)="setArgs(tool, $event)" placeholder="参数,空格分隔">
                <input class="form-control form-control-sm" [(ngModel)]="tool.cwd"
                    (ngModelChange)="save()" placeholder="工作目录(留空则跟随当前标签)">
                <button class="btn btn-secondary btn-sm" (click)="launch(tool)"
                    [disabled]="!tool.command" title="测试启动">
                    <i class="fas fa-play"></i>
                </button>
                <button class="btn btn-danger btn-sm" (click)="remove(i)" title="删除">
                    <i class="fas fa-trash"></i>
                </button>
            </div>

            <button class="btn btn-secondary mt-2" (click)="add()">
                <i class="fas fa-plus me-2"></i>
                <span>添加工具</span>
            </button>
        </div>
    `,
    styles: [`
        .tool-row {
            display: flex;
            gap: .5rem;
            margin-bottom: .5rem;
            align-items: center;
        }
        .tool-row input {
            flex: 1 1 0;
            min-width: 0;
        }
        .tool-row .btn {
            flex: 0 0 auto;
        }
    `],
})
export class AiCliSettingsTabComponent {
    constructor (
        public config: ConfigService,
        private launcher: AiCliLauncherService,
    ) { }

    get tools (): AiCliTool[] {
        return this.config.store.aiCliLauncher.tools
    }

    getArgsString (tool: AiCliTool): string {
        return (tool.args ?? []).join(' ')
    }

    setArgs (tool: AiCliTool, value: string): void {
        tool.args = value.split(' ').filter(x => x.length > 0)
        this.save()
    }

    add (): void {
        this.tools.push({ id: `tool-${Date.now()}`, name: '新工具', command: '', args: [] })
        this.save()
    }

    remove (index: number): void {
        this.tools.splice(index, 1)
        this.save()
    }

    launch (tool: AiCliTool): void {
        void this.launcher.launch(tool)
    }

    save (): void {
        this.config.save()
    }
}
