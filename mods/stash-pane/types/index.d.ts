export type Stash = { index: number; branch: string; message: string; age: string }

export type Stashes = { isRepo: boolean; list: Stash[] }

declare module 'claude-code' {
  interface PluginState {
    'stash-pane': { stashes: Stashes | null }
  }
}
