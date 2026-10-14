import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('env-ignore-status')

const line = atom({ plugin: 'env-ignore-status', key: 'line' } as const, '')

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

// The files that hold real secrets; .env.example is meant to be committed.
const ENV_FILES = ['.env', '.env.local', '.env.development', '.env.staging', '.env.production'] as const

const git = async ($: EngineInterface, root: string, args: readonly string[]): Promise<string[] | undefined> => {
  const ran = await $.process.run(['git', '--no-pager', ...args], { cwd: root, timeoutMs: 5000 }).catch(() => undefined)

  // check-ignore answers 1 when nothing is ignored: an empty list, not a failure.
  if (ran === undefined || ran.exitCode > 1) {
    return undefined
  }

  return ran.stdout.split('\n').map(name => name.trim()).filter(name => name !== '')
}

const refresh = async ($: EngineInterface): Promise<void> => {
  const root = await $.session.root()
  const present: string[] = []

  for (const file of ENV_FILES) {
    if (await $.fs.exists(`${root}/${file}`)) {
      present.push(file)
    }
  }

  const tracked = present.length === 0 ? undefined : await git($, root, ['ls-files', '--', ...present])
  const ignored = tracked === undefined ? undefined : await git($, root, ['check-ignore', '--', ...present])

  if (tracked === undefined || ignored === undefined) {
    return show($, undefined)
  }

  const s = await strings($)
  const loose = present.filter(file => !ignored.includes(file))
  const problems = [
    ...tracked.map(file => `${file} ${s.tracked}`),
    ...loose.filter(file => !tracked.includes(file)).map(file => `${file} ${s.notIgnored}`),
  ]

  const [first, ...rest] = problems

  return show($, first === undefined ? undefined : `${s.label} ✗ ${first}${rest.length > 0 ? ` +${rest.length}` : ''}`)
}

const CHANGES = /\bgit\b|\.env|\.gitignore/

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await refresh($)

    return set
  })

  on('session.start', async ($, e, next) => {
    await refresh($)
    $.clock.every(120000, () => void refresh($))

    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)

    if (CHANGES.test(e.command)) {
      void refresh($)
    }

    return ran
  })

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const ran = await next(e)

    if (CHANGES.test(e.command)) {
      void refresh($)
    }

    return ran
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)

    if (CHANGES.test(e.file_path)) {
      void refresh($)
    }

    return ran
  })
}
