import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('deps-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Outdated =Record<string, { current?: string; latest?: string }>

const major = (version: string | undefined): number => Number(/\d+/.exec(version ?? '')?.[0] ?? 0)

// One check per session, in the background: `npm outdated` is too slow to repeat.
const check = async ($: EngineInterface): Promise<void> => {
  const root = await $.session.root()

  if (!(await $.fs.exists(`${root}/package.json`)) || !(await $.fs.exists(`${root}/node_modules`))) {
    return
  }

  const isWindows = (await $.env.get('OS')) === 'Windows_NT'
  const argv = isWindows ? ['cmd', '/c', 'npm', 'outdated', '--json'] : ['npm', 'outdated', '--json']
  const ran = await $.process.run(argv, { cwd: root, timeoutMs: 90000 }).catch(() => undefined)

  if (ran === undefined) {
    return
  }

  let outdated: Outdated = {}

  try {
    outdated = JSON.parse(ran.stdout === '' ? '{}' : ran.stdout) as Outdated
  } catch {
    return
  }

  const entries = Object.values(outdated)
  const majors = entries.filter(entry => major(entry.latest) > major(entry.current)).length

  const s = await strings($)

  void show($,
    entries.length === 0
      ? `${s.label} ✓`
      : `${s.label} ${s.behind(entries.length)}${majors > 0 ? ` · ${majors} major` : ''}`,
  )
}

export const register: Register = on => {
  on('state.set', { plugin: 'cockpit', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', ($, e, next) => {
    void check($)

    return next(e)
  })
}
