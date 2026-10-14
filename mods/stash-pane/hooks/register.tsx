import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading } from './kit'
import { STRINGS } from './strings'

import type { Stash } from '../types'

const PANE = 'stash-pane'
const stashes = atom({ plugin: 'stash-pane', key: 'stashes' } as const, null)

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const age = (seconds: number): string => {
  const steps: [string, number][] = [['w', 604800], ['d', 86400], ['h', 3600], ['m', 60]]
  const step = steps.find(([, size]) => seconds >= size)

  return step === undefined ? `${Math.max(0, Math.floor(seconds))}s` : `${Math.floor(seconds / step[1])}${step[0]}`
}

// "stash@{2}", "1700000000", "On main: try cache" or "WIP on main: a1b2c3d subject"
const parse = (line: string, now: number): Stash => {
  const [ref = '', at = '0', ...subject] = line.split('\t')
  const text = subject.join('\t')
  const found = /^(?:WIP on|On) ([^:]+): (.*)$/.exec(text)

  return {
    index: Number(/\{(\d+)\}/.exec(ref)?.[1] ?? 0),
    branch: found?.[1] ?? '',
    message: found?.[2] ?? text,
    age: age(now - Number(at)),
  }
}

const load = async ($: EngineInterface): Promise<void> => {
  const ran = await $.process.run(['git', '--no-pager', 'stash', 'list', '--format=%gd%x09%ct%x09%gs'])

  if (ran.exitCode !== 0) {
    await update($, stashes, () => ({ isRepo: false, list: [] }))

    return
  }

  const now = (await $.clock.now()) / 1000
  const list = ran.stdout
    .split('\n')
    .filter(line => line.length > 0)
    .map(line => parse(line, now))

  await update($, stashes, () => ({ isRepo: true, list }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'stashes', description: (await strings($)).command })

    return next(e)
  })

  on('command.run', { command: 'stashes' }, async $ => {
    await load($)
    await $.ui.open({ id: PANE, title: 'Stashes' })

    return { text: (await strings($)).opened }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Button, Text } = ui
    const s = await strings($)
    const held = await read($, stashes)
    const list = held?.list ?? []
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 7)
    const wide = Math.min(20, Math.max(0, ...list.map(stash => stash.branch.length)))

    return (
      <Box flexDirection="column">
        {heading(ui, 'git', s.title, held?.isRepo === true ? s.summary(list.length) : '', e.props.bodyColumns)}
        <Button key="refresh" label={s.refresh} onPress={() => load($)} />
        {held === null && <Text dimColor>{s.notLoaded}</Text>}
        {held !== null && !held.isRepo && <Text dimColor>{s.notRepo}</Text>}
        {held?.isRepo === true && list.length === 0 && <Text dimColor>{s.none}</Text>}
        {list.slice(0, room).map(stash => (
          <Text wrap="truncate-end">
            <Text bold>{String(stash.index).padStart(2)}</Text> <Text dimColor>{stash.branch.slice(0, wide).padEnd(wide)}</Text>{' '}
            {stash.message} <Text dimColor>{stash.age}</Text>
          </Text>
        ))}
      </Box>
    )
  })
}
