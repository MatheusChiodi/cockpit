export type Diff = { added: number; removed: number; edits: number }

declare module 'claude-code' {
  interface PluginState {
    'session-diff-band': { diff: Diff }
  }
}
