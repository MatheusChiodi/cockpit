export type Split = {
  claude: number
  you: number
}

declare module 'claude-code' {
  interface PluginState {
    'hands-band': { split: Split | null }
  }
}
