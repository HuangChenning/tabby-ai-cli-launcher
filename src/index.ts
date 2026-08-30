import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import TabbyCoreModule, { ConfigProvider, ToolbarButtonProvider } from 'tabby-core'
import { SettingsTabProvider } from 'tabby-settings'

import { AiCliLauncherConfigProvider } from './configProvider'
import { AiCliToolbarButtonProvider } from './toolbarButtonProvider'
import { AiCliSettingsTabProvider } from './settings'
import { AiCliSettingsTabComponent } from './components/settingsTab.component'

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TabbyCoreModule,
    ],
    providers: [
        { provide: ConfigProvider, useClass: AiCliLauncherConfigProvider, multi: true },
        { provide: ToolbarButtonProvider, useClass: AiCliToolbarButtonProvider, multi: true },
        { provide: SettingsTabProvider, useClass: AiCliSettingsTabProvider, multi: true },
    ],
    declarations: [
        AiCliSettingsTabComponent,
    ],
})
export default class AiCliLauncherModule { } // eslint-disable-line @typescript-eslint/no-extraneous-class
