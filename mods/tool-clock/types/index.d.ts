export type Run = { ms: number; sub: boolean }

declare module 'claude-code' {
  interface PluginState {
    'tool-clock': { runs: Record<string, Run> }
  }
}
