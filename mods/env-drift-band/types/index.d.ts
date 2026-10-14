export type Missing = string[]

declare module 'claude-code' {
  interface PluginState {
    // Names of the keys .env.example has and the env files lack.
    'env-drift-band': { missing: Missing }
  }
}
