export type Tag = 'TODO' | 'FIXME' | 'HACK'

export type Hit = { tag: Tag; path: string; line: number; text: string }

export type Todos = {
  isRepo: boolean
  total: number
  counts: Record<Tag, number>
  hits: Hit[]
}

declare module 'claude-code' {
  interface PluginState {
    'code-todo-pane': { todos: Todos | null }
  }
}
