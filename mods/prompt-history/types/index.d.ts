export type Prompts = string[]

declare module 'claude-code' {
  interface PluginState {
    'prompt-history': { prompts: Prompts }
  }
}
