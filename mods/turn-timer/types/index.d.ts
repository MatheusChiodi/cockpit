export type Turn = {
  seconds: number
  tools: number
  outputTokens: number
  isAborted: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'turn-timer': { last: Turn | null; isHidden: boolean }
  }
}
