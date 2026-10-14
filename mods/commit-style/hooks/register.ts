import type { Register } from 'claude-code'

// Read by the model only: English, not translated.
const SECTION = {
  id: 'commit-style:rules',
  text: [
    '# Commit messages',
    'Use Conventional Commits: `type(optional scope): summary`, with type one of feat, fix, refactor, perf, test, docs, chore, build or ci.',
    'Summary in the imperative, lowercase, no trailing period, at most 72 characters.',
    'One commit per logical change; a body only when the why does not fit in the summary.',
    "Follow the language already used in the repository's history.",
  ].join('\n'),
  scope: 'session',
} as const

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)

    return { sections: [...composed.sections, SECTION] }
  })
}
