import { Injectable } from '@angular/core'
import { SettingsTabProvider } from 'tabby-settings'
import { AiCliSettingsTabComponent } from './components/settingsTab.component'

@Injectable()
export class AiCliSettingsTabProvider extends SettingsTabProvider {
    id = 'ai-cli-launcher'
    icon = 'terminal'
    title = 'AI CLI'

    getComponentType (): any {
        return AiCliSettingsTabComponent
    }
}
