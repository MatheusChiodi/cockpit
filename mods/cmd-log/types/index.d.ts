export type Run = {
  id: string
  command: string
  status: 'running' | 'ok' | 'failed'
  ms: number
}

declare module 'claude-code' {
  interface PluginState {
    'cmd-log': { runs: Run[] }
  }
}
