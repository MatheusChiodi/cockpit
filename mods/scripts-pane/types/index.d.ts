export type Script = { name: string; command: string }

export type Scripts = { isFound: boolean; list: Script[] }

declare module 'claude-code' {
  interface PluginState {
    'scripts-pane': { scripts: Scripts | null }
  }
}
