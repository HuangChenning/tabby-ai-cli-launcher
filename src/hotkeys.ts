import { Injectable } from '@angular/core'
import { HotkeyProvider, HotkeyDescription } from 'tabby-core'

export const TOGGLE_PANEL_HOTKEY = 'ai-cli-launcher.toggle-panel'

/**
 * No default binding is declared here on purpose: getting a cross-platform
 * default key combo wrong fails silently (Tabby just never fires the hotkey),
 * and this ID is already reachable from the toolbar button. Users who want a
 * shortcut can bind one themselves in Settings → Keybindings.
 */
@Injectable()
export class AiCliLauncherHotkeyProvider extends HotkeyProvider {
    async provide (): Promise<HotkeyDescription[]> {
        return [
            {
                id: TOGGLE_PANEL_HOTKEY,
                name: 'Toggle AI CLI panel',
            },
        ]
    }
}
