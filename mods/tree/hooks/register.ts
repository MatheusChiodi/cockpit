import type { EngineInterface, FsEntry, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const SKIPPED = new Set(['node_modules', '.git', 'dist', 'build'])
const CAP = 80

const ABSOLUTE = /^([A-Za-z]:|[\\/])/

const shown = (entry: FsEntry): boolean => !SKIPPED.has(entry.name) && !(entry.kind === 'dir' && entry.name.startsWith('.'))

// Folders first, then names; a folder is marked with a trailing slash.
const ordered = (entries: readonly FsEntry[]): FsEntry[] =>
  entries
    .filter(shown)
    .sort((a, b) => Number(b.kind === 'dir') - Number(a.kind === 'dir') || a.name.localeCompare(b.name))

const label = (entry: FsEntry, level: number): string =>
  `${'  '.repeat(level)}${entry.name}${entry.kind === 'dir' ? '/' : ''}`

const listing = async ($: EngineInterface, path: string): Promise<FsEntry[] | undefined> =>
  $.fs.list(path).then(ordered, () => undefined)

const draw = async ($: EngineInterface, typed: string): Promise<{ text: string }> => {
  const s = await strings($)
  const dir = typed.replace(/[\\/]+$/, '')
  const base = dir === '' ? await $.session.root() : ABSOLUTE.test(dir) ? dir : `${await $.session.root()}/${dir}`
  const top = await listing($, base)

  if (top === undefined) {
    return { text: s.missing(typed || '.') }
  }

  const lines: string[] = []

  for (const entry of top) {
    lines.push(label(entry, 0))

    if (entry.kind === 'dir' && lines.length < CAP) {
      for (const child of (await listing($, `${base}/${entry.name}`)) ?? []) {
        lines.push(label(child, 1))
      }
    }
  }

  if (lines.length === 0) {
    return { text: s.empty }
  }

  return {
    text:
      lines.length > CAP
        ? [...lines.slice(0, CAP), s.more(lines.length - CAP)].join('\n')
        : lines.join('\n'),
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'tree', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'tree' }, ($, e) => draw($, e.args.trim().replace(/^"(.*)"$/, '$1')))
}
