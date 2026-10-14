// Names only: no value of any .env file is ever kept.
export type EnvKeys = {
  hasExample: boolean
  hasEnv: boolean
  missing: string[]
  extra: string[]
}

declare module 'claude-code' {
  interface PluginState {
    'env-keys-pane': { keys: EnvKeys | null }
  }
}
