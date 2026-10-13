import type { EngineInterface, Register } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('stash-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

const refresh = async ($: EngineInterface): Promise<void> => {
  const ran = await $.process.run(['git', 'stash', 'list'], { timeoutMs: 5000 }).catch(() => undefined)
  const count = ran === undefined || ran.exitCode !== 0 ? 0 : ran.stdout.split('\n').filter(line => line !== '').length

  // Stash esquecido é trabalho perdido: só aparece quando existe.
  void show($, count === 0 ? undefined : `stash: ${count} guardado${count === 1 ? '' : 's'}`)
}

export const register: Register = on => {
  on('state.set', { plugin: 'turbina', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('session.start', async ($, e, next) => {
    await refresh($)
    $.clock.every(60000, () => void refresh($))

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($)

    return next(e)
  })
}
