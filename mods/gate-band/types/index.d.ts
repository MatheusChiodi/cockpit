export type Gate = {
  denied: number
  asked: number
  last: string
}

declare module 'claude-code' {
  interface PluginState {
    'gate-band': { gate: Gate }
  }
}
