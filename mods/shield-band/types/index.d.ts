export type Blocks = { count: number; last: string }

declare module 'claude-code' {
  interface PluginState {
    'shield-band': { blocks: Blocks }
  }
}
