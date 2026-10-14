export type Member = { id: string; label: string; type: string; status: string }

declare module 'claude-code' {
  interface PluginState {
    'agent-pane': { members: Member[] }
  }
}
