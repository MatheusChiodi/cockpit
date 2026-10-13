import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('pin-band')

const pins = atom({ plugin: 'pin-band', key: 'pins' } as const, [])

const MAX = 4

const keyOf = async ($: EngineInterface): Promise<string> => `pins:${await $.session.root()}`

// Lembretes curtos por projeto: o store guarda entre sessões, o state desenha.
const save = async ($: EngineInterface, list: string[]): Promise<void> => {
  await update($, pins, () => list)
  await $.store.set(await keyOf($), list)
}

const restore = async ($: EngineInterface): Promise<void> => {
  const held = await $.store.get(await keyOf($))
  const list = Array.isArray(held) ? held.filter((pin): pin is string => typeof pin === 'string') : []
  await update($, pins, () => list)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'pin',
      description: `Fixa até ${MAX} lembretes acima do prompt: /pin <texto>, /pin rm <n>, /pin clear`,
      argumentHint: '<texto> | rm <n> | clear',
    })
    await restore($)

    return next(e)
  })

  on('command.run', { command: 'pin' }, async ($, e) => {
    const text = e.args.trim()
    const [action, value] = text.split(/\s+/)
    const list = await read($, pins)

    if (text === '') {
      return { text: 'Uso: /pin <texto> | rm <n> | clear' }
    }

    if (text === 'clear') {
      await save($, [])

      return { text: 'Lembretes removidos.' }
    }

    if (action === 'rm' && value !== undefined) {
      const index = Number(value) - 1

      if (list[index] === undefined) {
        return { text: `Lembrete inexistente: ${value}` }
      }

      await save($, list.filter((_, at) => at !== index))

      return { text: `Lembrete ${index + 1} removido.` }
    }

    if (list.length >= MAX) {
      return { text: `Limite de ${MAX} lembretes. Remova um com /pin rm <n>.` }
    }

    await save($, [...list, text.slice(0, 100)])

    return { text: `Lembrete ${list.length + 1} fixado.` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const list = await read($, pins)

    if (e.props.hasSurvey || (await isOff($)) || list.length === 0) {
      return below
    }

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {below}
        {list.map((pin, index) => (
          <Text wrap="truncate-end">
            <Text color="remember">▸ {index + 1}</Text> {pin}
          </Text>
        ))}
      </Box>
    )
  })
}
