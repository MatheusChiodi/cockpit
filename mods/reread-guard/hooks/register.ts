import type { Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

type Seen = { mtimeMs: number; warned: boolean }

export const register: Register = on => {
  // What was read this session, by path and range, with the file's mtime at that moment.
  const seen = new Map<string, Seen>()

  // A compaction drops the old reads from the context: reading again is then right.
  on('session.compact', async (_$, e, next) => {
    const done = await next(e)

    if (done.skip === undefined) {
      seen.clear()
    }

    return done
  })

  // Reading an unchanged file again pays for the same tokens twice: refuse once, then let it through.
  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    const stat = await $.fs.stat(e.file_path).catch(() => undefined)

    if (stat === undefined || stat.kind !== 'file') {
      return next(e)
    }

    const key = `${e.file_path}|${e.offset ?? ''}|${e.limit ?? ''}|${e.pages ?? ''}`
    const held = seen.get(key)

    if (held !== undefined && held.mtimeMs === stat.mtimeMs && !held.warned) {
      seen.set(key, { ...held, warned: true })
      const s = STRINGS[(await $.state.get(LANG)).value ?? 'en']

      return { deny: s.again(e.file_path) }
    }

    const ran = await next(e)

    if (ran.deny === undefined && ran.isError !== true) {
      seen.set(key, { mtimeMs: stat.mtimeMs, warned: false })
    }

    return ran
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
