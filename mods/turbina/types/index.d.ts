export type Off = string[]

declare module 'claude-code' {
  interface PluginState {
    turbina: { off: Off }
  }
}
