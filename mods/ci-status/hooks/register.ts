import type { EngineInterface, Register } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('ci-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

type Run = { status?: string; conclusion?: string | null; workflowName?: string; headBranch?: string }

const POLL_MS = 120000

// Precisa do GitHub CLI (`gh`) autenticado; sem ele, ou fora de um repo do GitHub, não mostra nada.
const refresh = async ($: EngineInterface): Promise<void> => {
  const ran = await $.process
    .run(['gh', 'run', 'list', '--limit', '1', '--json', 'status,conclusion,workflowName,headBranch'], {
      timeoutMs: 15000,
    })
    .catch(() => undefined)

  if (ran === undefined || ran.exitCode !== 0) {
    void show($, undefined)

    return
  }

  let runs: Run[] = []

  try {
    runs = JSON.parse(ran.stdout) as Run[]
  } catch {
    runs = []
  }

  const last = runs[0]

  if (last === undefined) {
    void show($, undefined)

    return
  }

  const mark =
    last.status !== 'completed' ? '… rodando' : last.conclusion === 'success' ? '✓' : `✗ ${last.conclusion ?? 'falhou'}`

  void show($, `CI ${mark} · ${last.workflowName ?? 'workflow'} · ${last.headBranch ?? '?'}`)
}

export const register: Register = on => {
  on('state.set', { plugin: 'turbina', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', async ($, e, next) => {
    void refresh($)
    $.clock.every(POLL_MS, () => void refresh($))

    return next(e)
  })

  // Um push dispara o CI: confere logo depois, sem esperar o próximo pulso.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    const command = (e as unknown as { command?: unknown }).command

    if (typeof command === 'string' && /\bgit\s+push\b/.test(command)) {
      $.clock.after(15000, () => void refresh($))
    }

    return ran
  })
}
