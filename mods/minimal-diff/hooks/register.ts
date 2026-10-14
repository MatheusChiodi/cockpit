import type { Register } from 'claude-code'

const SECTION = {
  id: 'minimal-diff:rule',
  text: [
    '# Minimal diff',
    'Make the smallest change that solves the request.',
    'No drive-by refactors, renames or reformatting of lines you did not need to touch.',
    'If you notice such issues, mention them instead of fixing them.',
  ].join('\n'),
  scope: 'session',
} as const

export const register: Register = on => {
  on('prompt.compose', async (_$, e, next) => {
    const composed = await next(e)

    return { sections: [...composed.sections, SECTION] }
  })
}
