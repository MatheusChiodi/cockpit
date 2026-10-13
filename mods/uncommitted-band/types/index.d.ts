export type Pending = { changed: number; minutes: number }

declare module 'claude-code' {
  interface PluginState {
    'uncommitted-band': { pending: Pending | null }
  }
}
