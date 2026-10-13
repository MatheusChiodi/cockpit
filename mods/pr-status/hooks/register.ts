import type { EngineInterface, Register } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('pr-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

type PullRequest = { number?: number; state?: string; isDraft?: boolean; reviewDecision?: string }

const REVIEW: Record<string, string> = {
  APPROVED: '✓ aprovado',
  CHANGES_REQUESTED: '✗ mudanças pedidas',
  REVIEW_REQUIRED: '… aguardando review',
}

// Precisa do GitHub CLI (`gh`) autenticado; sem PR na branch atual, não mostra nada.
const refresh = async ($: EngineInterface): Promise<void> => {
  const ran = await $.process
    .run(['gh', 'pr', 'view', '--json', 'number,state,isDraft,reviewDecision'], { timeoutMs: 15000 })
    .catch(() => undefined)

  if (ran === undefined || ran.exitCode !== 0) {
    void show($, undefined)

    return
  }

  let pr: PullRequest = {}

  try {
    pr = JSON.parse(ran.stdout) as PullRequest
  } catch {
    pr = {}
  }

  if (pr.number === undefined) {
    void show($, undefined)

    return
  }

  const state =
    pr.state === 'MERGED'
      ? '⇄ mergeado'
      : pr.state === 'CLOSED'
        ? 'fechado'
        : pr.isDraft === true
          ? 'rascunho'
          : (REVIEW[pr.reviewDecision ?? ''] ?? 'aberto')

  void show($, `pr #${pr.number} ${state}`)
}

export const register: Register = on => {
  on('state.set', { plugin: 'turbina', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', ($, e, next) => {
    void refresh($)
    $.clock.every(180000, () => void refresh($))

    return next(e)
  })
}
