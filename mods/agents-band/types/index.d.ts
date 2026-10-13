export type Worker = { id: string; label: string; status: string }

declare module 'claude-code' {
  interface PluginState {
    'agents-band': { workers: Worker[] }
  }
}
