export type Thrash = {
  path: string
  count: number
}

declare module 'claude-code' {
  interface PluginState {
    'edit-thrash-band': { thrash: Thrash[] }
  }
}
