import type { Register } from 'claude-code'

const SECTION = {
  id: 'branch-naming:rules',
  text: "# Branch naming\nName branches `<type>/<short-kebab-subject>` with type one of `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`.\nSubject: 2 to 5 lowercase words, no ticket prose, no dates, no author names.\nNever commit new work straight to the default branch (main, master, develop): create a branch first.",
  scope: 'session',
} as const

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)

    return { sections: [...composed.sections, SECTION] }
  })
}
