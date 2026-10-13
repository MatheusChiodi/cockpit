export type Percent = number

declare module 'claude-code' {
  interface PluginState {
    'compact-nudge': { percent: Percent }
  }
}
