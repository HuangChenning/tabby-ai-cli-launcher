import { BaseTerminalTabComponent } from 'tabby-terminal'

export async function getTabCwd (tab: BaseTerminalTabComponent<any>): Promise<string | null> {
    try {
        return (await tab.session?.getWorkingDirectory()) ?? null
    } catch {
        return null
    }
}

/** Last `maxLines` of the tab's scrollback, as plain text (ANSI stripped). */
export function getTabScrollback (tab: BaseTerminalTabComponent<any>, maxLines: number): string {
    const xterm = (tab.frontend as any)?.xterm
    if (!xterm?.buffer?.active) {
        return ''
    }
    const buffer = xterm.buffer.active
    const total: number = buffer.length
    const start = Math.max(0, total - maxLines)
    const lines: string[] = []
    for (let i = start; i < total; i++) {
        const line = buffer.getLine(i)
        if (line) {
            lines.push(line.translateToString(true))
        }
    }
    return lines.join('\n').trim()
}
