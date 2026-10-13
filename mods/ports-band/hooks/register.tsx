import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('ports-band')

const up = atom({ plugin: 'ports-band', key: 'up' } as const, [])

// Portas comuns de dev: React/Next, Vite, Angular, Expo, APIs.
const PORTS = [3000, 3001, 4200, 5000, 5173, 8000, 8080, 8081, 19006] as const

const probe = async ($: EngineInterface): Promise<void> => {
  const answers = await Promise.all(
    PORTS.map(port =>
      $.http
        .fetch(`http://localhost:${port}/`, { method: 'HEAD' })
        .then(() => port)
        .catch(() => undefined),
    ),
  )
  const found = answers.filter((port): port is (typeof PORTS)[number] => port !== undefined)

  await update($, up, held => (held.join() === found.join() ? held : found))
}

export const register: Register = on => {
  on('session.start', ($, e, next) => {
    void probe($)
    $.clock.every(20000, () => void probe($))

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const ports = await read($, up)

    if (e.props.hasSurvey || (await isOff($)) || ports.length === 0) {
      return below
    }

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {below}
        <Text wrap="truncate-end">
          <Text color="success">● no ar:</Text> {ports.map(port => `localhost:${port}`).join('  ')}
        </Text>
      </Box>
    )
  })
}
