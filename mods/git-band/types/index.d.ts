export type GitInfo = {
  branch: string
  changed: number
  added: number
  removed: number
  ahead: number
  behind: number
  subject: string
  age: string
}

declare module 'claude-code' {
  interface PluginState {
    'git-band': { info: GitInfo | null }
  }
}
