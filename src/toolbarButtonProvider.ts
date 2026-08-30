import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, ToolbarButton, ConfigService, SelectorService, SelectorOption } from 'tabby-core'
import { AiCliTool, DEFAULT_TOOLS } from './api'
import { AiCliLauncherService } from './launcher.service'
import { AI_CLI_ICON } from './icons'

/**
 * `ToolbarButton.submenu` is declared in tabby-core's typings but this
 * Tabby version's `Command.fromToolbarButton()` (tabby-core/src/api/commands.ts)
 * never reads it - only `click` survives the conversion to a Command. So a
 * single button with a submenu silently does nothing when clicked. Using one
 * button that opens the built-in fuzzy selector (the same one behind the
 * profile picker, ⌘-E) sidesteps that entirely and needs no extra UI code.
 */
@Injectable()
export class AiCliToolbarButtonProvider extends ToolbarButtonProvider {
    constructor (
        private config: ConfigService,
        private selector: SelectorService,
        private launcher: AiCliLauncherService,
    ) {
        super()
    }

    provide (): ToolbarButton[] {
        return [
            {
                icon: AI_CLI_ICON,
                title: 'AI CLI',
                click: () => {
                    void this.pickAndLaunch()
                },
            },
        ]
    }

    private getTools (): AiCliTool[] {
        const tools = this.config.store.aiCliLauncher?.tools
        return Array.isArray(tools) && tools.length > 0 ? tools : DEFAULT_TOOLS
    }

    private async pickAndLaunch (): Promise<void> {
        if (this.selector.active) {
            return
        }
        const tools = this.getTools()
        if (tools.length === 0) {
            return
        }
        const options: SelectorOption<AiCliTool>[] = tools.map(tool => ({
            name: tool.name,
            description: [tool.command, ...(tool.args ?? [])].join(' '),
            result: tool,
        }))
        const chosen = await this.selector.show('Launch AI CLI', options).catch(() => null)
        if (chosen) {
            await this.launcher.launch(chosen)
        }
    }
}
