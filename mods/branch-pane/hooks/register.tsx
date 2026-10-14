import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading } from './kit'
import { STRINGS } from './strings'

import type { Branch } from '../types'

const PANE = 'branch-pane'
const branches = atom({ plugin: 'branch-pane', key: 'branches' } as const, null)

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const FORMAT = '%(HEAD)%09%(refname:short)%09%(upstream:short)%09%(upstream:track,nobracket)%09%(committerdate:unix)'

const age = (seconds: number): string => {
  const steps: [string, number][] = [['w', 604800], ['d', 86400], ['h', 3600], ['m', 60]]
  const step = steps.find(([, size]) => seconds >= size)

  return step === undefined ? `${Math.max(0, Math.floor(seconds))}s` : `${Math.floor(seconds / step[1])}${step[0]}`
}

const parse = (line: string, now: number): Branch => {
  const [head = '', name = '', upstream = '', track = '', at = '0'] = line.split('\t')

  return {
    name,
    isCurrent: head === '*',
    upstream,
    ahead: Number(/ahead (\d+)/.exec(track)?.[1] ?? 0),
    behind: Number(/behind (\d+)/.exec(track)?.[1] ?? 0),
    isGone: track === 'gone',
    age: age(now - Number(at)),
  }
}

const load = async ($: EngineInterface): Promise<void> => {
  const ran = await $.process.run(['git', '--no-pager', 'for-each-ref', 'refs/heads', '--sort=-committerdate', `--format=${FORMAT}`])

  if (ran.exitCode !== 0) {
    await update($, branches, () => ({ isRepo: false, list: [] }))

    return
  }

  const now = (await $.clock.now()) / 1000
  const list = ran.stdout
    .split('\n')
    .filter(line => line.length > 0)
    .map(line => parse(line, now))

  await update($, branches, () => ({ isRepo: true, list }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'branches', description: (await strings($)).command })

    return next(e)
  })

  on('command.run', { command: 'branches' }, async $ => {
    await load($)
    await $.ui.open({ id: PANE, title: 'Branches' })

    return { text: (await strings($)).opened }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Button, Text } = ui
    const s = await strings($)
    const held = await read($, branches)
    const list = held?.list ?? []
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 7)
    const wide = Math.min(32, Math.max(8, e.props.bodyColumns - 30))

    return (
      <Box flexDirection="column">
        {heading(ui, 'git', s.title, held?.isRepo === true ? s.summary(list.length) : '', e.props.bodyColumns)}
        <Button key="refresh" label={s.refresh} onPress={() => load($)} />
        {held === null && <Text dimColor>{s.notLoaded}</Text>}
        {held !== null && !held.isRepo && <Text dimColor>{s.notRepo}</Text>}
        {held?.isRepo === true && list.length === 0 && <Text dimColor>{s.none}</Text>}
        {list.slice(0, room).map(branch => (
          <Text wrap="truncate-end">
            <Text color={branch.isCurrent ? 'claude' : 'inactive'}>{branch.isCurrent ? '● ' : '  '}</Text>
            <Text bold={branch.isCurrent}>{branch.name.slice(0, wide).padEnd(wide)}</Text>{' '}
            {branch.upstream === '' ? (
              <Text dimColor>{s.noUpstream}</Text>
            ) : branch.isGone ? (
              <Text color="warning">{s.gone}</Text>
            ) : (
              <Text>
                <Text color={branch.ahead > 0 ? 'success' : 'inactive'}>↑{branch.ahead}</Text>{' '}
                <Text color={branch.behind > 0 ? 'warning' : 'inactive'}>↓{branch.behind}</Text>
              </Text>
            )}
            <Text dimColor>  {branch.age}</Text>
          </Text>
        ))}
      </Box>
    )
  })
}
