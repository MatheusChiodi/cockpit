import type { Register } from 'claude-code'

const SECTION = {
  id: 'ask-first:rule',
  text: [
    '# Ambiguity',
    'When a request has two reasonable readings that lead to different code, ask one short question before acting.',
    'Otherwise proceed without asking.',
  ].join('\n'),
  scope: 'session',
} as const

export const register: Register = on => {
  on('prompt.compose', async (_$, e, next) => {
    const composed = await next(e)

    return { sections: [...composed.sections, SECTION] }
  })
}
