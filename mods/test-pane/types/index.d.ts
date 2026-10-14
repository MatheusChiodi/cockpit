export type Run = { command: string; ok: boolean; ms: number; at: number }

declare module 'claude-code' {
  interface PluginState {
    'test-pane': { runs: Run[] }
  }
}
