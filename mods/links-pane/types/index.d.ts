export type Links = string[]

declare module 'claude-code' {
  interface PluginState {
    'links-pane': { links: Links }
  }
}
