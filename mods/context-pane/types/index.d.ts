export type Slice = { name: string; tokens: number; kind: 'used' | 'free' | 'buffer' }

export type Window = { total: number; max: number; slices: Slice[] }

declare module 'claude-code' {
  interface PluginState {
    'context-pane': { window: Window | null }
  }
}
