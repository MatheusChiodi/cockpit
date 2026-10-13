import type { Register } from 'claude-code'

const SECTION = {
  id: 'pt-br:language',
  text: [
    '# Idioma',
    'Responda sempre em português do Brasil, com acentuação correta.',
    'Termos técnicos, nomes de APIs, comandos e identificadores de código ficam no original.',
    'Mensagens de commit e comentários de código seguem o idioma já usado no repositório.',
  ].join('\n'),
  scope: 'session',
} as const

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)

    return { sections: [...composed.sections, SECTION] }
  })
}
