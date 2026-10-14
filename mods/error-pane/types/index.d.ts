export type Failure = { tool: string; input: string; message: string }

declare module 'claude-code' {
  interface PluginState {
    'error-pane': { failures: Failure[] }
  }
}
