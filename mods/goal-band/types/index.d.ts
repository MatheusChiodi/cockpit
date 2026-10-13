export type Goal = string

declare module 'claude-code' {
  interface PluginState {
    'goal-band': { goal: Goal }
  }
}
