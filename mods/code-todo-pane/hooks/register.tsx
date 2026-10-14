import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { heading } from './kit'
import { STRINGS } from './strings'

import type { Hit, Tag } from '../types'

const PANE = 'code-todo-pane'
const todos = atom({ plugin: 'code-todo-pane', key: 'todos' } as const, null)

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const CAP = 60
const TAGS: readonly Tag[] = ['TODO', 'FIXME', 'HACK']
const COLOR: Record<Tag, string> = { TODO: 'warning', FIXME: 'error', HACK: 'claude' }

// "src/a.ts:12:  // TODO: x" -> a hit, or nothing when the line has no tag
const parse = (line: string): Hit | undefined => {
  const found = /^([^:]+):(\d+):(.*)$/.exec(line)
  const tag = /\b(TODO|FIXME|HACK)\b/.exec(found?.[3] ?? '')?.[1] as Tag | undefined

  return found === null || tag === undefined
    ? undefined
    : { tag, path: found[1] ?? '', line: Number(found[2]), text: (found[3] ?? '').trim().slice(0, 160) }
}

const load = async ($: EngineInterface): Promise<void> => {
  // Exit 1 is "no match", not a failure; anything above is not a repository.
  const ran = await $.process.run(['git', '--no-pager', 'grep', '-n', '-I', '-w', '-E', 'TODO|FIXME|HACK'])

  if (ran.exitCode > 1) {
    await update($, todos, () => ({ isRepo: false, total: 0, counts: { TODO: 0, FIXME: 0, HACK: 0 }, hits: [] }))

    return
  }

  const all = ran.stdout.split('\n').map(parse).filter((hit): hit is Hit => hit !== undefined)
  const counts = { TODO: 0, FIXME: 0, HACK: 0 }

  for (const hit of all) {
    counts[hit.tag] += 1
  }

  const hits = TAGS.flatMap(tag => all.filter(hit => hit.tag === tag)).slice(0, CAP)
  await update($, todos, () => ({ isRepo: true, total: all.length, counts, hits }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'codetodo', description: (await strings($)).command })

    return next(e)
  })

  on('command.run', { command: 'codetodo' }, async $ => {
    await load($)
    await $.ui.open({ id: PANE, title: 'Code TODO' })

    return { text: (await strings($)).opened }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Button, Text } = ui
    const s = await strings($)
    const held = await read($, todos)
    const width = Math.max(16, e.props.bodyColumns - 4)
    let room = Math.max(2, (e.viewport?.rows ?? 24) - 7)

    const groups = TAGS.map(tag => {
      const rows = (held?.hits ?? []).filter(hit => hit.tag === tag)
      const shown = rows.length === 0 || room < 2 ? [] : rows.slice(0, room - 1)
      room -= rows.length === 0 ? 0 : shown.length + 1

      return { tag, shown, count: held?.counts[tag] ?? 0 }
    }).filter(group => group.shown.length > 0)

    return (
      <Box flexDirection="column">
        {heading(ui, 'project', s.title, held?.isRepo === true ? s.summary(held.total, held.hits.length) : '', e.props.bodyColumns)}
        <Button key="refresh" label={s.refresh} onPress={() => load($)} />
        {held === null && <Text dimColor>{s.notLoaded}</Text>}
        {held !== null && !held.isRepo && <Text dimColor>{s.notRepo}</Text>}
        {held?.isRepo === true && held.total === 0 && <Text dimColor>{s.none}</Text>}
        {groups.map(group => (
          <Box flexDirection="column">
            <Text>
              <Text color={COLOR[group.tag]} bold>
                {group.tag}
              </Text>{' '}
              <Text dimColor>{group.count}</Text>
            </Text>
            {group.shown.map(hit => (
              <Text wrap="truncate-end">
                <Text dimColor>{`  ${hit.path}:${hit.line}`}</Text> {hit.text.slice(0, width)}
              </Text>
            ))}
          </Box>
        ))}
      </Box>
    )
  })
}
