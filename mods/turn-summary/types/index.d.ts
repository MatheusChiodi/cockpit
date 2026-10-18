export type Tally = { tools: number; failed: number; files: string[] }

export type Closed = Tally & { ms: number }

declare module 'claude-code' {
  interface PluginState {
    'turn-summary': { open: Tally; closed: Closed[] }
  }
}
