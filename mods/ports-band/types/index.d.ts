export type Ports = number[]

declare module 'claude-code' {
  interface PluginState {
    'ports-band': { up: Ports }
  }
}
