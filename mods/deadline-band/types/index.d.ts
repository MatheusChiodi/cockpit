export type Countdown = {
  label: string
  left: string
  date: string
  tone: 'error' | 'warning' | 'text'
}

declare module 'claude-code' {
  interface PluginState {
    'deadline-band': { countdown: Countdown | null }
  }
}
