export type Pins = string[]

declare module 'claude-code' {
  interface PluginState {
    'pin-band': { pins: Pins }
  }
}
