import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('migration-status')

const line = atom({ plugin: 'migration-status', key: 'line' } as const, '')

// Sends the text to the status line only when it changed.
const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  const next = (await isOff($)) ? '' : (text ?? '')

  if ((await read($, line)) === next) {
    return
  }

  await update($, line, () => next)
  $.ui.status(next === '' ? undefined : next)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Where Prisma, Rails, Flyway, Liquibase, Knex, Drizzle, Supabase and Alembic keep their migrations.
const PATHSPECS = [
  ':(glob)**/migrations/**',
  ':(glob)**/migration/**',
  ':(glob)**/migrate/**',
  ':(glob)**/alembic/versions/**',
  ':(glob)**/drizzle/*.sql',
] as const

const MUTATING = /\bmigrat|\bprisma\b|\brails\b|\bflyway\b|\balembic\b|\bgit\b|\bdrizzle/i

const refresh = async ($: EngineInterface): Promise<void> => {
  const root = await $.session.root()
  const args = ['--no-pager', 'status', '--porcelain=v1', '--untracked-files=all', '--', ...PATHSPECS]
  const ran = await $.process.run(['git', ...args], { cwd: root, timeoutMs: 5000 }).catch(() => undefined)

  if (ran === undefined || ran.exitCode !== 0) {
    return show($, undefined)
  }

  const changes = ran.stdout.split('\n').filter(entry => entry.trim() !== '')
  const added = changes.filter(entry => /^(\?\?|A.|.A)/.test(entry)).length
  const edited = changes.filter(entry => /^( M|M.|.M)/.test(entry)).length

  if (added === 0 && edited === 0) {
    return show($, undefined)
  }

  const s = await strings($)
  const parts = [added > 0 ? s.added(added) : undefined, edited > 0 ? s.edited(edited) : undefined]

  return show($, `${s.label} ${parts.filter(part => part !== undefined).join(' · ')}`)
}

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await refresh($)

    return set
  })

  on('session.start', async ($, e, next) => {
    await refresh($)
    $.clock.every(60000, () => void refresh($))

    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)

    if (MUTATING.test(e.command)) {
      void refresh($)
    }

    return ran
  })

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const ran = await next(e)

    if (MUTATING.test(e.command)) {
      void refresh($)
    }

    return ran
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)

    if (/migrat|alembic|drizzle/i.test(e.file_path)) {
      void refresh($)
    }

    return ran
  })
}
