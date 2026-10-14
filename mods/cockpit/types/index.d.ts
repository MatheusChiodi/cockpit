export type Lang = 'en' | 'pt' | 'es'

declare module 'claude-code' {
  interface PluginState {
    // off: the panels switched off. lang: the language every Cockpit mod speaks.
    cockpit: { off: string[]; lang: Lang }
  }
}
