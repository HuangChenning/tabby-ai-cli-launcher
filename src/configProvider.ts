import { Injectable } from '@angular/core'
import { ConfigProvider } from 'tabby-core'
import { DEFAULT_TOOLS } from './api'

@Injectable()
export class AiCliLauncherConfigProvider extends ConfigProvider {
    defaults = {
        aiCliLauncher: {
            tools: DEFAULT_TOOLS,
            chat: {
                contextLines: 50,
                panelWidthPercent: 38,
            },
        },
    }
}
