export interface AiCliTool {
    id: string
    name: string
    command: string
    args?: string[]
    cwd?: string
}

export const DEFAULT_TOOLS: AiCliTool[] = [
    { id: 'claude', name: 'Claude', command: 'claude', args: [] },
    { id: 'codex', name: 'Codex', command: 'codex', args: [] },
    { id: 'agent', name: 'Agent', command: 'agent', args: [] },
    { id: 'pi', name: 'Pi', command: 'pi', args: [] },
]
