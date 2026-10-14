export type Mismatch = { tool: string; want: string; have: string }

declare module 'claude-code' {
  interface PluginState {
    'runtime-band': { found: Mismatch[] }
  }
}
