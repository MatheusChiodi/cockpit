export type Usage = {
  percent: number
  usd: number | null
  limits: { kind: string; percent: number }[]
}

declare module 'claude-code' {
  interface PluginState {
    'usage-band': { usage: Usage | null }
  }
}
