import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'

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

    const ui = $.ui.resolve(e)
    const { Text } = ui

    return row(
      ui,
      'projeto',
      'no ar',
      <Text wrap="truncate-end">
        {ports.map(port => (
          <Text>
            <Text color="success">● </Text>localhost:{port}{'   '}
          </Text>
        ))}
      </Text>,
      below,
    )
  })
}
