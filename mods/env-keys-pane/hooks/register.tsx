import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading } from './kit'
import { STRINGS } from './strings'

const PANE = 'env-keys-pane'
const keys = atom({ plugin: 'env-keys-pane', key: 'keys' } as const, null)

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Only the name before "=" leaves this function; the values are never kept, drawn or logged.
const namesOf = (text: string): string[] =>
  text
    .split('\n')
    .map(line => /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=/.exec(line)?.[1])
    .filter((name): name is string => name !== undefined)

const names = async ($: EngineInterface, path: string): Promise<string[] | undefined> => {
  try {
    return namesOf(await $.fs.read(path))
  } catch {
    return undefined
  }
}

const load = async ($: EngineInterface): Promise<void> => {
  const example = await names($, '.env.example')
  const env = await names($, '.env')
  const wanted = example ?? []
  const held = env ?? []

  await update($, keys, () => ({
    hasExample: example !== undefined,
    hasEnv: env !== undefined,
    missing: [...new Set(wanted.filter(name => !held.includes(name)))],
    extra: [...new Set(held.filter(name => !wanted.includes(name)))],
  }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'envkeys', description: (await strings($)).command })

    return next(e)
  })

  on('command.run', { command: 'envkeys' }, async $ => {
    await load($)
    await $.ui.open({ id: PANE, title: 'Env keys' })

    return { text: (await strings($)).opened }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Button, Text } = ui
    const s = await strings($)
    const held = await read($, keys)
    const missing = held?.missing ?? []
    const extra = held?.extra ?? []
    const room = Math.max(2, (e.viewport?.rows ?? 24) - 9)
    // Each list gets half the room; what one leaves unused goes to the other.
    const shownMissing = missing.slice(0, Math.max(Math.ceil(room / 2), room - extra.length))
    const shownExtra = extra.slice(0, room - shownMissing.length)

    return (
      <Box flexDirection="column">
        {heading(ui, 'project', s.title, held?.hasExample === true ? s.summary(missing.length, extra.length) : '', e.props.bodyColumns)}
        <Button key="refresh" label={s.refresh} onPress={() => load($)} />
        {held === null && <Text dimColor>{s.notLoaded}</Text>}
        {held !== null && !held.hasExample && <Text dimColor>{s.noExample}</Text>}
        {held?.hasExample === true && !held.hasEnv && <Text color="warning">{s.noEnv}</Text>}
        {held?.hasExample === true && held.hasEnv && missing.length === 0 && extra.length === 0 && (
          <Text color="success">✓ {s.inSync}</Text>
        )}
        {shownMissing.length > 0 && (
          <Text>
            <Text color="error" bold>
              {s.missing}
            </Text>{' '}
            <Text dimColor>{s.missingNote}</Text>
          </Text>
        )}
        {shownMissing.map(name => (
          <Text wrap="truncate-end">
            <Text color="error">✗ </Text>
            {name}
          </Text>
        ))}
        {shownExtra.length > 0 && (
          <Text>
            <Text color="warning" bold>
              {s.extra}
            </Text>{' '}
            <Text dimColor>{s.extraNote}</Text>
          </Text>
        )}
        {shownExtra.map(name => (
          <Text wrap="truncate-end">
            <Text color="warning">+ </Text>
            {name}
          </Text>
        ))}
      </Box>
    )
  })
}
