export type TouchKind = 'read' | 'edit' | 'write'

export type Touch = { path: string; kind: TouchKind; count: number }

declare module 'claude-code' {
  interface PluginState {
    'file-trail': { touches: Touch[] }
  }
}
