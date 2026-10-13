export type Branch = string

declare module 'claude-code' {
  interface PluginState {
    'main-warning-band': { branch: Branch }
  }
}
