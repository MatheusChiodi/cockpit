import type { Register } from 'claude-code'

const SECTION = {
  id: 'no-comments:rule',
  text: [
    '# Comments',
    'Do not write a comment that restates the code.',
    'No banner or divider comments. No commented-out code.',
    'Keep a comment only when it explains why.',
  ].join('\n'),
  scope: 'session',
} as const

export const register: Register = on => {
  on('prompt.compose', async (_$, e, next) => {
    const composed = await next(e)

    return { sections: [...composed.sections, SECTION] }
  })
}
