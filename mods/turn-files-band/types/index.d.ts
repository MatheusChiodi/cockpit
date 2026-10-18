export type Touch = {
  path: string
  isEdited: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'turn-files-band': { files: Touch[] }
  }
}
