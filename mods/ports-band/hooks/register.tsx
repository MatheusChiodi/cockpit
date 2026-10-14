import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'
import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('ports-band')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const up = atom({ plugin: 'ports-band', key: 'up' } as const, [])

// Common dev ports: React/Next, Vite, Angular, Expo, APIs.
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
    const s = await strings($)

    return row(
      ui,
      'project',
      s.label,
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
