import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// What a shortcut turns into is read by the model only: English, not translated.
const SHORTCUTS: Record<string, string> = {
  fix: 'Find the root cause of the error below, fix it and explain in one line what was wrong.',
  test: 'Write tests for the code below covering the happy path, edge cases and errors, and run them.',
  review: 'Review the current diff looking for bugs, regressions and security risks. List them by severity.',
  explain: 'Explain the code below step by step, as for someone new to the project.',
  refactor: 'Refactor the code below for clean code and performance, without changing its behavior.',
  doc: 'Document the code below in the comment style already used in the repository.',
  commit: 'Commit the current changes with a message that follows the repository history.',
}

const PATTERN = /^::([a-z]+)\b\s*/

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'shortcuts', description: (await strings($)).description })

    return next(e)
  })

  on('command.run', { command: 'shortcuts' }, () => ({
    text: Object.entries(SHORTCUTS)
      .map(([name, text]) => `::${name}  →  ${text}`)
      .join('\n'),
  }))

  on('prompt.submit', ($, e, next) => {
    const name = PATTERN.exec(e.text)?.[1]
    const expansion = name === undefined ? undefined : SHORTCUTS[name]

    if (expansion === undefined) {
      return next(e)
    }

    const rest = e.text.replace(PATTERN, '').trim()

    return next({ ...e, text: rest === '' ? expansion : `${expansion}\n\n${rest}` })
  })
}
