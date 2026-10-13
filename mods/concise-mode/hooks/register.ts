import type { Register } from 'claude-code'

const KEY = 'isOn'

const SECTION = {
  id: 'concise-mode:style',
  text: [
    '# Modo conciso',
    'Responda no menor texto que resolve: sem introdução, sem recapitular, sem conclusão.',
    'Código: só o trecho alterado. Dúvidas: bullets curtos. Erros: a correção direta.',
  ].join('\n'),
  scope: 'session',
} as const

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'concise',
      description: 'Liga/desliga o modo conciso (respostas curtas e diretas)',
      argumentHint: '[on|off]',
    })

    if ((await $.store.get(KEY)) === true) {
      $.ui.status('conciso')
    }

    return next(e)
  })

  on('command.run', { command: 'concise' }, async ($, e) => {
    const wanted = e.args.trim().toLowerCase()
    const isOn = wanted === 'on' ? true : wanted === 'off' ? false : (await $.store.get(KEY)) !== true

    await $.store.set(KEY, isOn)
    $.ui.status(isOn ? 'conciso' : undefined)

    return { text: `Modo conciso ${isOn ? 'ligado' : 'desligado'} (vale a partir do próximo prompt).` }
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)

    return (await $.store.get(KEY)) === true
      ? { sections: [...composed.sections, SECTION] }
      : composed
  })
}
