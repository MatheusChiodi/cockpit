export type Count = number

declare module 'claude-code' {
  interface PluginState {
    // TODO, FIXME and HACK markers Claude wrote in this session.
    'todo-new-status': { added: Count; line: string }
  }
}
