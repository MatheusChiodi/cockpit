export type LastPrompt = string

declare module 'claude-code' {
  interface PluginState {
    'last-prompt-band': { last: LastPrompt }
  }
}
