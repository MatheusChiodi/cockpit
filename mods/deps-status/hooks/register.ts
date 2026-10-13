import type { EngineInterface, Register } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('deps-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

type Outdated = Record<string, { current?: string; latest?: string }>

const major = (version: string | undefined): number => Number(/\d+/.exec(version ?? '')?.[0] ?? 0)

// Uma checagem por sessão, em segundo plano: `npm outdated` é lento demais para repetir.
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

  void show($, 
    entries.length === 0
      ? 'deps ✓ em dia'
      : `deps: ${entries.length} desatualizada${entries.length === 1 ? '' : 's'}${majors > 0 ? ` (${majors} major)` : ''}`,
  )
}

export const register: Register = on => {
  on('state.set', { plugin: 'turbina', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', ($, e, next) => {
    void check($)

    return next(e)
  })
}
