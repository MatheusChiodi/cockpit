export type Failure = { command: string; line: string }

declare module 'claude-code' {
  interface PluginState {
    'error-band': { failure: Failure | null }
  }
}
