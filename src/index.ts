import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import TabbyCoreModule, { ConfigProvider, ToolbarButtonProvider, HotkeyProvider } from 'tabby-core'
import TabbyTerminalModule, { TerminalDecorator } from 'tabby-terminal'
import { SettingsTabProvider } from 'tabby-settings'

import { AiCliLauncherConfigProvider } from './configProvider'
import { AiCliToolbarButtonProvider } from './toolbarButtonProvider'
import { AiCliSettingsTabProvider } from './settings'
import { AiCliSettingsTabComponent } from './components/settingsTab.component'
import { AiCliPanelComponent } from './components/aiPanel.component'
import { AiCliPanelDecorator } from './decorators/aiPanelDecorator'
import { AiCliLauncherHotkeyProvider } from './hotkeys'

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TabbyCoreModule,
        TabbyTerminalModule,
    ],
    providers: [
        { provide: ConfigProvider, useClass: AiCliLauncherConfigProvider, multi: true },
        { provide: ToolbarButtonProvider, useClass: AiCliToolbarButtonProvider, multi: true },
        { provide: SettingsTabProvider, useClass: AiCliSettingsTabProvider, multi: true },
        { provide: HotkeyProvider, useClass: AiCliLauncherHotkeyProvider, multi: true },
        // `useExisting`, not `useClass`: the toolbar button also injects
        // AiCliPanelDecorator directly to toggle the focused tab's panel, and
        // that must be the *same* instance that tracks open panels here -
        // `useClass` would silently construct a second, empty-state copy.
        { provide: TerminalDecorator, useExisting: AiCliPanelDecorator, multi: true },
    ],
    declarations: [
        AiCliSettingsTabComponent,
        AiCliPanelComponent,
    ],
})
export default class AiCliLauncherModule { } // eslint-disable-line @typescript-eslint/no-extraneous-class
