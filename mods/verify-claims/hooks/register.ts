import type { Register } from 'claude-code'

const SECTION = {
  id: 'verify-claims:rule',
  text: [
    '# Verification',
    'Do not say something works without running it.',
    'End with what you verified and what you did not.',
  ].join('\n'),
  scope: 'session',
} as const

export const register: Register = on => {
  on('prompt.compose', async (_$, e, next) => {
    const composed = await next(e)

    return { sections: [...composed.sections, SECTION] }
  })
}
