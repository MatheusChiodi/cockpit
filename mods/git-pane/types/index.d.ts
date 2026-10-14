export type Change = { code: string; path: string }

export type Commit = { hash: string; subject: string; age: string }

export type Repo = {
  isRepo: boolean
  branch: string
  ahead: number
  behind: number
  files: Change[]
  commits: Commit[]
}

declare module 'claude-code' {
  interface PluginState {
    'git-pane': { repo: Repo | null }
  }
}
