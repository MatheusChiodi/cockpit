import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading } from './kit'
import { STRINGS } from './strings'

import type { Script } from '../types'

const PANE = 'scripts-pane'
const scripts = atom({ plugin: 'scripts-pane', key: 'scripts' } as const, null)

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const load = async ($: EngineInterface): Promise<void> => {
  let list: Script[] | undefined

  try {
    const pkg: unknown = JSON.parse(await $.fs.read('package.json'))
    const held = (pkg as { scripts?: unknown }).scripts
    list =
      typeof held === 'object' && held !== null
        ? Object.entries(held).map(([name, command]) => ({ name, command: String(command) }))
        : []
  } catch {
    list = undefined
  }

  await update($, scripts, () => ({ isFound: list !== undefined, list: list ?? [] }))
}

// What the model reads, so it stays in English whatever the language.
const pick = async ($: EngineInterface, name: string): Promise<void> => {
  await $.prompt.fill({ text: `Run npm run ${name} and fix what fails`, mode: 'replace' })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'scripts', description: (await strings($)).command })

    return next(e)
  })

  on('command.run', { command: 'scripts' }, async $ => {
    await load($)
    await $.ui.open({ id: PANE, title: 'Scripts' })

    return { text: (await strings($)).opened }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Button, Text } = ui
    const s = await strings($)
    const held = await read($, scripts)
    const list = held?.list ?? []
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 7)
    const wide = Math.min(20, Math.max(0, ...list.map(one => one.name.length)))
    const width = Math.max(8, e.props.bodyColumns - wide - 6)

    return (
      <Box flexDirection="column">
        {heading(ui, 'project', s.title, held?.isFound === true ? s.summary(list.length) : '', e.props.bodyColumns)}
        <Button key="refresh" label={s.refresh} onPress={() => load($)} />
        {held === null && <Text dimColor>{s.notLoaded}</Text>}
        {held !== null && !held.isFound && <Text dimColor>{s.notFound}</Text>}
        {held?.isFound === true && list.length === 0 && <Text dimColor>{s.none}</Text>}
        {list.slice(0, room).map(one => (
          <Button key={`script:${one.name}`} plain onPress={() => pick($, one.name)}>
            <Text color="claude">▸ </Text>
            <Text bold>{one.name.slice(0, wide).padEnd(wide)}</Text>{' '}
            <Text dimColor>{one.command.slice(0, width)}</Text>
          </Button>
        ))}
      </Box>
    )
  })
}
