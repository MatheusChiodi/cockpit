export type Files = string[]

declare module 'claude-code' {
  interface PluginState {
    'files-band': { files: Files }
  }
}
