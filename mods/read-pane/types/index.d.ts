export type Reading = { path: string; count: number }

declare module 'claude-code' {
  interface PluginState {
    'read-pane': { readings: Reading[] }
  }
}
