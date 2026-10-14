import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row, meter, INDENT } from './kit'
import { STRINGS } from './strings'

import type { Todo } from '../types'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('todo-band')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const items = atom({ plugin: 'todo-band', key: 'items' } as const, [])

const VISIBLE = 5

// The list is per project and outlives the session: the store keeps it, the state draws it.
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
    const s = await strings($)
    await $.command.register({ name: 'todo', description: s.command, argumentHint: s.hint })
    await restore($)

    return next(e)
  })

  on('command.run', { command: 'todo' }, async ($, e) => {
    const s = await strings($)
    const text = e.args.trim()
    const [action, value] = text.split(/\s+/)
    const index = Number(value) - 1
    const list = await read($, items)

    if (text === '') {
      return { text: s.usage }
    }

    if (action === 'clear') {
      await update($, items, held => held.filter(todo => !todo.isDone))
      await persist($)

      return { text: s.cleared }
    }

    if ((action === 'done' || action === 'rm') && value !== undefined) {
      const target = list[index]

      if (target === undefined) {
        return { text: s.missing(value) }
      }

      if (action === 'done') {
        await toggle($, target.id)

        return { text: s.toggled(index + 1, target.isDone) }
      }

      await update($, items, held => held.filter(todo => todo.id !== target.id))
      await persist($)

      return { text: s.removed(index + 1) }
    }

    const todo: Todo = { id: crypto.randomUUID(), text: text.slice(0, 120), isDone: false }
    await update($, items, held => [...held, todo])
    await persist($)

    return { text: s.added(list.length + 1) }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const list = await read($, items)

    if (e.props.hasSurvey || (await isOff($)) || list.length === 0) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Box, Button, Text } = ui
    const s = await strings($)
    const done = list.filter(todo => todo.isDone).length
    // Pending first: that is what matters to see all the time.
    const shown = [...list].sort((a, b) => Number(a.isDone) - Number(b.isDone)).slice(0, VISIBLE)

    return (
      <Box flexDirection="column">
        {row(
          ui,
          'daily',
          s.label,
          <Text>
            {meter(ui, (done / list.length) * 100, 10, 'success')}{' '}
            <Text bold>
              {done}/{list.length}
            </Text>
            {list.length > VISIBLE && <Text dimColor>  {s.hidden(list.length - VISIBLE)}</Text>}
          </Text>,
          below,
        )}
        {shown.map(todo => (
          <Box>
            <Text>{INDENT}</Text>
            <Button key={`todo:${todo.id}`} plain onPress={() => toggle($, todo.id)}>
              <Text color={todo.isDone ? 'success' : 'warning'}>{todo.isDone ? '◆' : '◇'}</Text>{' '}
              <Text dimColor={todo.isDone} strikethrough={todo.isDone}>
                {todo.text}
              </Text>
            </Button>
          </Box>
        ))}
      </Box>
    )
  })
}
