export type Bytes = number

declare module 'claude-code' {
  interface PluginState {
    // The first size seen in the session (-1 before it) and the text last sent to the status line.
    'build-size-status': { first: Bytes; line: string }
  }
}
