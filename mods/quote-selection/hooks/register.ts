import type { Register } from 'claude-code'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'quote',
      description: 'Cita no prompt o texto selecionado com o mouse (modo fullscreen)',
    })

    return next(e)
  })

  on('command.run', { command: 'quote' }, async $ => {
    const selected = await $.ui.selection()

    if (selected === undefined || selected.text.trim() === '') {
      return { text: 'Nada selecionado. Selecione um trecho com o mouse e rode /quote.' }
    }

    const quoted = selected.text.replace(/^/gm, '> ')
    const { isFilled } = await $.prompt.fill({ text: `${quoted}\n\n`, mode: 'insert' })

    return { text: isFilled ? 'Seleção citada no prompt.' : 'Não foi possível escrever no prompt agora.' }
  })
}
