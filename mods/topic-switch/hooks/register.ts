import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// A prompt is a new subject when it has this many words of substance and none of them is in the work so far.
const MIN_WORDS = 4
// The work is in flight once this many files were changed since the last commit.
const MIN_FILES = 3
const MIN_LENGTH = 4
const TOAST_MS = 12000
// Words that carry no subject, in English and Portuguese.
const FILLER = new Set(
  'about after also because before could does from have into just make need please should that then there these they this what when where which with would your como para pois mais mas que uma uns umas pelo pela por com sem sobre depois antes tambem isso essa esse este esta fazer faça preciso quero agora'.split(' '),
)

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const COMMIT = /\bgit\s+(?:-c\s+\S+\s+|-\S+\s+)*commit\b/

// Module state: the work since the last commit, as the words of its prompts and file paths.
const task: { words: Set<string>; files: Set<string> } = { words: new Set(), files: new Set() }

const wordsOf = (text: string): Set<string> =>
  new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(word => word.length >= MIN_LENGTH && !FILLER.has(word) && !/^[0-9]+$/.test(word)),
  )

const clear = (): void => {
  task.words = new Set()
  task.files = new Set()
}

const note = (path: string, agentId: unknown): void => {
  if (agentId === undefined) {
    task.files.add(path)

    for (const word of wordsOf(path)) {
      task.words.add(word)
    }
  }
}

const watch = async <R extends { deny?: string; isError?: boolean }>(command: string, run: () => Promise<R>): Promise<R> => {
  const ran = await run()

  if (ran.deny === undefined && ran.isError !== true && COMMIT.test(command)) {
    clear()
  }

  return ran
}

export const register: Register = on => {
  on('session.start', (_$, e, next) => {
    clear()

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    const words = wordsOf(e.text)

    if (task.files.size >= MIN_FILES && words.size >= MIN_WORDS && ![...words].some(word => task.words.has(word))) {
      $.ui.toast((await strings($)).switched(task.files.size), { timeoutMs: TOAST_MS })
    }

    // The new prompt joins the work either way, so the same subject is not told twice.
    for (const word of words) {
      task.words.add(word)
    }

    return next(e)
  })

  on('tool.call', { tool: 'Edit' }, async (_$, e, next) => {
    const ran = await next(e)
    note(e.file_path, (e as { agentId?: string }).agentId)

    return ran
  })

  on('tool.call', { tool: 'Write' }, async (_$, e, next) => {
    const ran = await next(e)
    note(e.file_path, (e as { agentId?: string }).agentId)

    return ran
  })

  on('tool.call', { tool: 'Bash' }, (_$, e, next) => watch(e.command, () => next(e)))

  on('tool.call', { tool: 'PowerShell' }, (_$, e, next) => watch(e.command, () => next(e)))
}
