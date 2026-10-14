export type Edit = { path: string; added: number; removed: number }

declare module 'claude-code' {
  interface PluginState {
    'diff-pane': { edits: Edit[] }
  }
}
