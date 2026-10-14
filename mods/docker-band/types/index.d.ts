export type DockerInfo = { down: boolean; up: number; total: number; stopped: string[] }

declare module 'claude-code' {
  interface PluginState {
    'docker-band': { info: DockerInfo | null }
  }
}
