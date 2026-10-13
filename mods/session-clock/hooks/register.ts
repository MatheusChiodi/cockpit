import type { EngineInterface, Register } from 'claude-code'

const elapsed = (ms: number): string => {
  const minutes = Math.max(0, Math.floor(ms / 60000))
  const hours = Math.floor(minutes / 60)

  return hours > 0 ? `${hours}h${String(minutes % 60).padStart(2, '0')}` : `${minutes}min`
}

const tick = async ($: EngineInterface): Promise<void> => {
  const [{ startedAt }, now, turns] = await Promise.all([
    $.session.usage(),
    $.clock.now(),
    $.session.turns(),
  ])

  $.ui.status(`⏱ ${elapsed(now - startedAt)} · ${turns} prompts`)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await tick($)
    // O timer morre sozinho num reload do módulo.
    $.clock.every(30000, () => void tick($))

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await tick($)

    return next(e)
  })
}
