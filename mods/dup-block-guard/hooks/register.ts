import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const CODE = /\.(?:[cm]?[jt]sx?|py|java|kt|kts|go|rs|cs|scala|vue|svelte)$/i

const WINDOW = 6
const MIN_SIGNIFICANT = 4

// A line that carries code: more than braces, brackets and punctuation.
const isSignificant = (line: string): boolean => line.replace(/[\s{}()[\];,]/g, '').length >= 6

// Every run of WINDOW consecutive non-blank lines (trimmed) with enough code in it, keyed by its text.
const windows = (text: string): Map<string, string> => {
  const lines = text.split('\n').map(line => line.trim())
  const found = new Map<string, string>()

  for (let at = 0; at + WINDOW <= lines.length; at += 1) {
    const run = lines.slice(at, at + WINDOW)

    if (run.every(line => line !== '') && run.filter(isSignificant).length >= MIN_SIGNIFICANT) {
      found.set(run.join('\n'), run.find(isSignificant) ?? run[0] ?? '')
    }
  }

  return found
}

const without = (file: string, removed: string): string => {
  const at = file.indexOf(removed)

  return at < 0 ? file : file.slice(0, at) + file.slice(at + removed.length)
}

// The first line of a block the edit adds that the rest of the file already holds.
const repeated = (file: string, before: string, after: string): string | undefined => {
  const present = windows(without(file, before))
  const kept = windows(before)

  for (const [key, start] of windows(after)) {
    if (present.has(key) && !kept.has(key)) {
      return start
    }
  }

  return undefined
}

const verdict = async ($: EngineInterface, path: string, before: string, after: string): Promise<string | undefined> => {
  if (!CODE.test(path) || after.split('\n').length < WINDOW) {
    return undefined
  }

  const file = await $.fs.read(path).catch(() => undefined)
  const start = typeof file === 'string' ? repeated(file, before, after) : undefined

  return start === undefined ? undefined : (await strings($)).blocked(WINDOW, start.slice(0, 60))
}

export const register: Register = on => {
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const deny = await verdict($, e.file_path, e.old_string, e.new_string)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
