export type Doing = { id: string; label: string } | null

declare module 'claude-code' {
  interface PluginState {
    'spinner-doing': { doing: Doing }
  }
}
