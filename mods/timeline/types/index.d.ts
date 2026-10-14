export type Kind = 'prompt' | 'tool' | 'fail' | 'turn'

export type Entry = { at: number; kind: Kind; text: string }

declare module 'claude-code' {
  interface PluginState {
    timeline: { entries: Entry[] }
  }
}
