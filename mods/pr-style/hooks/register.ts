import type { Register } from 'claude-code'

const SECTION = {
  id: 'pr-style:rules',
  text: "# Pull request descriptions\nTitle in Conventional Commits form: `type(scope): imperative summary`, under 72 characters.\nBody has four short parts: What changed, Why, How it was tested, Risks (say \"none\" only if true).\nState concrete facts: files, behaviours, commands run. No filler, no restating the diff line by line.",
  scope: 'session',
} as const

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)

    return { sections: [...composed.sections, SECTION] }
  })
}
