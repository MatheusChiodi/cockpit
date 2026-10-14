export type Stamp = { text: string; at: number }

declare module 'claude-code' {
  interface PluginState {
    'prompt-stamp': { stamps: Stamp[] }
  }
}
