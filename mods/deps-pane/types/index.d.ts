export type Jump = 'major' | 'minor' | 'patch'

export type Dep = { name: string; current: string; wanted: string; latest: string; jump: Jump }

export type Deps = { isOk: boolean; list: Dep[] }

declare module 'claude-code' {
  interface PluginState {
    'deps-pane': { deps: Deps | null }
  }
}
