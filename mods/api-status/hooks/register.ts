import type { EngineInterface, Register } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('api-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

type StatusPage = { status?: { indicator?: string; description?: string } }

// Página pública de status (formato Statuspage). Sem rede ou sem resposta válida, não mostra nada.
const refresh = async ($: EngineInterface): Promise<void> => {
  const answer = await $.http.fetch('https://status.anthropic.com/api/v2/status.json').catch(() => undefined)

  if (answer === undefined || !answer.ok) {
    void show($, undefined)

    return
  }

  let page: StatusPage = {}

  try {
    page = JSON.parse(answer.text) as StatusPage
  } catch {
    page = {}
  }

  const indicator = page.status?.indicator

  void show($, 
    indicator === undefined
      ? undefined
      : indicator === 'none'
        ? 'API ✓ operacional'
        : `API ⚠ ${(page.status?.description ?? indicator).slice(0, 60)}`,
  )
}

export const register: Register = on => {
  on('state.set', { plugin: 'turbina', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', ($, e, next) => {
    void refresh($)
    $.clock.every(5 * 60000, () => void refresh($))

    return next(e)
  })
}
