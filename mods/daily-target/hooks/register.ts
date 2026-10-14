import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

type Target = { n: number; day: string; isHalfTold: boolean; isFullTold: boolean }

const MAX_TARGET = 50
const WANTED = /^(\d+)(?:\s+commits?)?$/i

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const pad = (value: number): string => String(value).padStart(2, '0')

// Local calendar day, the same midnight `git log --since=midnight` counts from.
const dayOf = (ms: number): string => {
  const date = new Date(ms)

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// One target per repository: the store key is the session's root.
const keyOf = async ($: EngineInterface): Promise<string> => `target:${await $.session.root()}`

const load = async ($: EngineInterface): Promise<Target | undefined> => {
  const held = await $.store.get(await keyOf($))

  return typeof held === 'object' && held !== null ? (held as Target) : undefined
}

// Your commits since midnight on any branch; undefined when git or the email is not there.
const commitsToday = async ($: EngineInterface): Promise<number | undefined> => {
  try {
    const email = await $.process.run(['git', 'config', 'user.email'])

    if (email.exitCode !== 0 || email.stdout.trim() === '') {
      return undefined
    }

    const log = await $.process.run([
      'git',
      'log',
      '--all',
      '--since=midnight',
      '--fixed-strings',
      `--author=${email.stdout.trim()}`,
      '--format=%H',
    ])

    return log.exitCode === 0 ? log.stdout.split('\n').filter(line => line.trim() !== '').length : undefined
  } catch {
    return undefined
  }
}

const check = async ($: EngineInterface): Promise<void> => {
  const held = await load($)

  if (held === undefined) {
    return
  }

  const today = dayOf(await $.clock.now())
  const target = held.day === today ? held : { ...held, day: today, isHalfTold: false, isFullTold: false }
  const count = await commitsToday($)

  if (count === undefined) {
    return
  }

  const s = await strings($)
  const half = Math.ceil(target.n / 2)

  if (count >= target.n && !target.isFullTold) {
    $.ui.toast(s.reached(count, target.n), { timeoutMs: 15000 })
    await $.store.set(await keyOf($), { ...target, isHalfTold: true, isFullTold: true })
  } else if (count >= half && count < target.n && !target.isHalfTold) {
    $.ui.toast(s.halfway(count, target.n), { timeoutMs: 15000 })
    await $.store.set(await keyOf($), { ...target, isHalfTold: true })
  } else if (target !== held) {
    await $.store.set(await keyOf($), target)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'target', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    await check($).catch(() => undefined)

    return done
  })

  on('command.run', { command: 'target' }, async ($, e) => {
    const s = await strings($)
    const args = e.args.trim()
    const held = await load($)

    if (args.toLowerCase() === 'off') {
      await $.store.delete(await keyOf($))

      return { text: s.off }
    }

    if (args === '') {
      const count = await commitsToday($)

      return { text: held === undefined ? s.none : s.status(held.n, count) }
    }

    const wanted = WANTED.exec(args)
    const n = Number(wanted?.[1])

    if (wanted === null || n < 1 || n > MAX_TARGET) {
      return { text: s.usage(MAX_TARGET) }
    }

    await $.store.set(await keyOf($), { n, day: dayOf(await $.clock.now()), isHalfTold: false, isFullTold: false })

    return { text: s.set(n) }
  })
}
