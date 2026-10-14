export type Turn = { ms: number; calls: number; tokens: number; failed: boolean }

declare module 'claude-code' {
  interface PluginState {
    'turn-history': { turns: Turn[]; calls: number }
  }
}
