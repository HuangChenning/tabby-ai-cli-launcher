import { Injectable } from '@angular/core'
import { ProfilesService, PartialProfile, Profile } from 'tabby-core'
import { AiCliTool } from './api'

/**
 * Tabby is a GUI app: launched from the Dock/Finder it does not inherit the
 * PATH set up by ~/.zshrc (fnm, ~/.local/bin, etc.), so the bare command
 * would fail with "command not found" even though it works in every
 * interactive terminal. Routing through `$SHELL --login -i -c` forces the
 * login shell to source its rc files (the `-i` is required because with
 * `-c` zsh/bash otherwise only run their *login* startup files, not .zshrc)
 * before exec'ing the target tool.
 */
function shellQuote (arg: string): string {
    return `'${arg.replace(/'/g, String.raw`'\''`)}'`
}

@Injectable({ providedIn: 'root' })
export class AiCliLauncherService {
    constructor (private profiles: ProfilesService) { }

    async launch (tool: AiCliTool): Promise<void> {
        const shell = process.env.SHELL ?? '/bin/zsh'
        const commandLine = [tool.command, ...(tool.args ?? [])].map(shellQuote).join(' ')

        const profile: PartialProfile<Profile> = {
            type: 'local',
            name: tool.name,
            options: {
                command: shell,
                args: ['--login', '-i', '-c', `exec ${commandLine}`],
                cwd: tool.cwd || null,
            },
        }

        await this.profiles.openNewTabForProfile(profile)
    }
}
