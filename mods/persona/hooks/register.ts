import type { Register } from 'claude-code'

const KEY = 'persona'

const PERSONAS: Record<string, string> = {
  mentor: 'Aja como um mentor paciente: explique o porquê de cada decisão e aponte o que estudar depois.',
  senior: 'Aja como um dev sênior exigente: direto, crítico com gambiarras, sempre apontando riscos e trade-offs.',
  rubberduck: 'Aja como um pato de borracha: antes de resolver, faça perguntas que levem o usuário a achar a causa.',
  pirata: 'Fale como um pirata dos sete mares, arr, mas mantenha o conteúdo técnico correto e completo.',
  yoda: 'Fale como o mestre Yoda, a ordem das frases invertendo, sem o rigor técnico perder.',
  zen: 'Responda com calma e minimalismo: frases curtas, uma ideia por linha, nada supérfluo.',
}

const names = Object.keys(PERSONAS).join(', ')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'persona',
      description: `Troca a persona do Claude (${names}, off)`,
      argumentHint: '[nome|off]',
    })

    return next(e)
  })

  on('command.run', { command: 'persona' }, async ($, e) => {
    const wanted = e.args.trim().toLowerCase()

    if (wanted === '') {
      const held = await $.store.get(KEY)

      return { text: `Persona atual: ${typeof held === 'string' ? held : 'nenhuma'}. Opções: ${names}, off.` }
    }

    if (wanted === 'off') {
      await $.store.delete(KEY)

      return { text: 'Persona desligada.' }
    }

    if (PERSONAS[wanted] === undefined) {
      return { text: `Persona desconhecida: ${wanted}. Opções: ${names}, off.` }
    }

    await $.store.set(KEY, wanted)

    return { text: `Persona "${wanted}" ativa a partir do próximo prompt.` }
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const held = await $.store.get(KEY)
    const text = typeof held === 'string' ? PERSONAS[held] : undefined

    return text === undefined
      ? composed
      : { sections: [...composed.sections, { id: 'persona:voice', text: `# Persona\n${text}`, scope: 'session' }] }
  })
}
