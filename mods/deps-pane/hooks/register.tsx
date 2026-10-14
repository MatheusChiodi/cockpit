import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading } from './kit'
import { STRINGS } from './strings'

import type { Dep, Jump } from '../types'

const PANE = 'deps-pane'
const deps = atom({ plugin: 'deps-pane', key: 'deps' } as const, null)

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const RANK: Record<Jump, number> = { major: 0, minor: 1, patch: 2 }
const TONE: Record<Jump, string | undefined> = { major: 'error', minor: 'warning', patch: undefined }

const part = (version: string, at: number): number => Number(version.split('.')[at]?.replace(/\D.*$/, '') ?? 0)

const jumpOf = (current: string, latest: string): Jump =>
  part(current, 0) !== part(latest, 0) ? 'major' : part(current, 1) !== part(latest, 1) ? 'minor' : 'patch'

const load = async ($: EngineInterface): Promise<void> => {
  const argv = ['npm', 'outdated', '--json']
  const isWindows = (await $.env.get('OS')) === 'Windows_NT'
  // Exit 1 just means "something is outdated"; the JSON on stdout says what.
  const ran = await $.process.run(isWindows ? ['cmd', '/c', ...argv] : argv, { timeoutMs: 120000 })
  let parsed: unknown

  try {
    parsed = ran.stdout.trim() === '' ? {} : JSON.parse(ran.stdout)
  } catch {
    parsed = undefined
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    await update($, deps, () => ({ isOk: false, list: [] }))

    return
  }

  const list: Dep[] = Object.entries(parsed as Record<string, { current?: string; wanted?: string; latest?: string }>)
    .map(([name, one]) => {
      const current = one.current ?? ''
      const latest = one.latest ?? ''

      return { name, current, wanted: one.wanted ?? '', latest, jump: current === '' ? 'patch' : jumpOf(current, latest) }
    })
    .sort((a, b) => RANK[a.jump] - RANK[b.jump] || a.name.localeCompare(b.name))

  await update($, deps, () => ({ isOk: true, list }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'deps', description: (await strings($)).command })

    return next(e)
  })

  on('command.run', { command: 'deps' }, async $ => {
    await load($)
    await $.ui.open({ id: PANE, title: 'Deps' })

    return { text: (await strings($)).opened }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Button, Text } = ui
    const s = await strings($)
    const held = await read($, deps)
    const list = held?.list ?? []
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 8)
    const wide = Math.min(28, Math.max(s.package.length, ...list.map(dep => dep.name.length)))
    const cell = (text: string) => (text === '' ? '-' : text).slice(0, 9).padEnd(10)
    const major = list.filter(dep => dep.jump === 'major').length

    return (
      <Box flexDirection="column">
        {heading(ui, 'project', s.title, held?.isOk === true ? s.summary(list.length, major) : '', e.props.bodyColumns)}
        <Button key="refresh" label={s.refresh} onPress={() => load($)} />
        {held === null && <Text dimColor>{s.notLoaded}</Text>}
        {held !== null && !held.isOk && <Text dimColor>{s.failed}</Text>}
        {held?.isOk === true && list.length === 0 && <Text dimColor>{s.none}</Text>}
        {list.length > 0 && (
          <Text dimColor wrap="truncate-end">
            {s.package.padEnd(wide)} {cell(s.current)}
            {cell(s.wanted)}
            {s.latest}
          </Text>
        )}
        {list.slice(0, room).map(dep => (
          <Text color={TONE[dep.jump]} wrap="truncate-end">
            {dep.name.slice(0, wide).padEnd(wide)} {cell(dep.current)}
            {cell(dep.wanted)}
            {dep.latest}
          </Text>
        ))}
      </Box>
    )
  })
}
