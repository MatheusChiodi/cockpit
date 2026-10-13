export type Mood = 'idle' | 'working' | 'happy' | 'sad' | 'sleepy'

declare module 'claude-code' {
  interface PluginState {
    'terminal-pet': { mood: Mood }
  }
}
