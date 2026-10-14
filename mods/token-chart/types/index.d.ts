export type Tokens = number[]

declare module 'claude-code' {
  interface PluginState {
    'token-chart': { tokens: Tokens }
  }
}
