import type { Register } from 'claude-code'

const SECTION = {
  id: 'commit-style:rules',
  text: [
    '# Mensagens de commit',
    'Use Conventional Commits: `tipo(escopo opcional): resumo`, com tipo em feat, fix, refactor, perf, test, docs, chore, build ou ci.',
    'Resumo no imperativo, minúsculo, sem ponto final, com no máximo 72 caracteres.',
    'Um commit por mudança lógica; corpo só quando o porquê não cabe no resumo.',
    'Siga o idioma já usado no histórico do repositório.',
  ].join('\n'),
  scope: 'session',
} as const

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)

    return { sections: [...composed.sections, SECTION] }
  })
}
