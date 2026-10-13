export type Focus = { left: number; total: number }

declare module 'claude-code' {
  interface PluginState {
    'focus-band': { focus: Focus | null }
  }
}
