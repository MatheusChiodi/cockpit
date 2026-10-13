import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Todo } from '../types'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('todo-band')

const items = atom({ plugin: 'todo-band', key: 'items' } as const, [])

const VISIBLE = 5

// A lista é por projeto e sobrevive à sessão: o store guarda, o state desenha.
const persist = async ($: EngineInterface): Promise<void> => {
  await $.store.set(`todos:${await $.session.root()}`, await read($, items))
}

const restore = async ($: EngineInterface): Promise<void> => {
  const held = await $.store.get(`todos:${await $.session.root()}`)
  const list = Array.isArray(held) ? (held as Todo[]) : []
  await update($, items, () => list)
}

const toggle = async ($: EngineInterface, id: string): Promise<void> => {
  await update($, items, list => list.map(todo => (todo.id === id ? { ...todo, isDone: !todo.isDone } : todo)))
  await persist($)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'todo',
      description: 'Tarefas fixas acima do prompt: /todo <texto>, /todo done <n>, /todo rm <n>, /todo clear',
      argumentHint: '<texto> | done <n> | rm <n> | clear',
    })
    await restore($)

    return next(e)
  })

  on('command.run', { command: 'todo' }, async ($, e) => {
    const text = e.args.trim()
    const [action, value] = text.split(/\s+/)
    const index = Number(value) - 1
    const list = await read($, items)

    if (text === '') {
      return { text: 'Uso: /todo <texto> | done <n> | rm <n> | clear' }
    }

    if (action === 'clear') {
      await update($, items, held => held.filter(todo => !todo.isDone))
      await persist($)

      return { text: 'Tarefas concluídas removidas.' }
    }

    if ((action === 'done' || action === 'rm') && value !== undefined) {
      const target = list[index]

      if (target === undefined) {
        return { text: `Tarefa inexistente: ${value}` }
      }

      if (action === 'done') {
        await toggle($, target.id)

        return { text: `Tarefa ${index + 1} ${target.isDone ? 'reaberta' : 'concluída'}.` }
      }

      await update($, items, held => held.filter(todo => todo.id !== target.id))
      await persist($)

      return { text: `Tarefa ${index + 1} removida.` }
    }

    const todo: Todo = { id: crypto.randomUUID(), text: text.slice(0, 120), isDone: false }
    await update($, items, held => [...held, todo])
    await persist($)

    return { text: `Tarefa ${list.length + 1} adicionada.` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const list = await read($, items)

    if (e.props.hasSurvey || (await isOff($)) || list.length === 0) {
      return below
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const done = list.filter(todo => todo.isDone).length
    // Pendentes primeiro: é o que importa ver o tempo todo.
    const shown = [...list].sort((a, b) => Number(a.isDone) - Number(b.isDone)).slice(0, VISIBLE)

    return (
      <Box flexDirection="column">
        {below}
        <Text dimColor>
          Tarefas {done}/{list.length}
          {list.length > VISIBLE ? ` · +${list.length - VISIBLE} ocultas` : ''}
        </Text>
        {shown.map(todo => (
          <Button key={`todo:${todo.id}`} plain onPress={() => toggle($, todo.id)}>
            <Text color={todo.isDone ? 'success' : 'warning'}>{todo.isDone ? '☑' : '☐'}</Text>{' '}
            <Text dimColor={todo.isDone} strikethrough={todo.isDone}>
              {todo.text}
            </Text>
          </Button>
        ))}
      </Box>
    )
  })
}
