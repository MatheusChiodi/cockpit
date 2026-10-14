export type Line = string

declare module 'claude-code' {
  interface PluginState {
    // The text last sent to the status line: an equal one is not sent again.
    'install-status': { line: Line }
  }
}
