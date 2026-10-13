export type Trouble = { operation: string; conflicts: number }

declare module 'claude-code' {
  interface PluginState {
    'conflict-band': { trouble: Trouble | null }
  }
}
