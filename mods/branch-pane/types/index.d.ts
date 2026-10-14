export type Branch = {
  name: string
  isCurrent: boolean
  upstream: string
  ahead: number
  behind: number
  isGone: boolean
  age: string
}

export type Branches = { isRepo: boolean; list: Branch[] }

declare module 'claude-code' {
  interface PluginState {
    'branch-pane': { branches: Branches | null }
  }
}
