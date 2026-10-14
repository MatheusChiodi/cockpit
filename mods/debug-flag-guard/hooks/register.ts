import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'
import type { What } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Rule = {
  pattern: RegExp
  what: What
  on: 'text' | 'command'
  path?: RegExp
  skip?: readonly RegExp[]
}

const RULES: readonly Rule[] = [
  {
    pattern: /^\s*DEBUG\s*=\s*True\b|\bapp\.run\([^)]*\bdebug\s*=\s*True|\bFLASK_DEBUG\s*[=:]\s*["']?1|\bAPP_DEBUG\s*[=:]\s*["']?true|--inspect(?:-brk)?=0\.0\.0\.0/i,
    what: 'debug',
    on: 'text',
    skip: [/^\s*(?:\/\/|#|\*|\/\*|<!--)/],
  },
  {
    pattern: /\bmanagement\.endpoints\.web\.exposure\.include\s*[=:]\s*["']?\*|\bspring\.h2\.console\.enabled\s*[=:]\s*true/,
    what: 'exposure',
    on: 'text',
    skip: [/^\s*(?:\/\/|#|\*|\/\*|<!--)/],
  },
  {
    pattern: /^\s*(?:[A-Z_]*DEBUG\s*[=:]\s*["']?(?:true|1|\*)["']?|NODE_ENV\s*[=:]\s*["']?development["']?)\s*$/i,
    what: 'prodDebug',
    on: 'text',
    path: /prod/i,
    skip: [/^\s*(?:\/\/|#|\*|\/\*|<!--)/],
  },
]

// Files where the pattern is expected: tests, fixtures, docs and examples.
const SKIP_PATH = /(^|[\\/])(tests?|__tests__|fixtures?|docs?)[\\/]|(^|[\\/._-])(dev|development|local|test|tests|example|sample)([\\/._-]|$)|\.(md|mdx|txt)$/i

const fieldOf = (input: unknown, key: string): string => {
  const value = typeof input === 'object' && input !== null ? (input as Record<string, unknown>)[key] : undefined

  return typeof value === 'string' ? value : ''
}

const isClean = (rule: Rule, line: string): boolean => !rule.pattern.test(line) || (rule.skip ?? []).some(skip => skip.test(line))

// Only what the edit adds: the lines of new_string that old_string did not already hold.
const addedLines = (tool: string, input: unknown): string[] => {
  const text = tool === 'Write' ? fieldOf(input, 'content') : fieldOf(input, 'new_string')
  const known = new Set(fieldOf(input, 'old_string').split('\n').map(line => line.trim()))

  return text.split('\n').filter(line => line.trim() !== '' && !known.has(line.trim()))
}

const finding = (tool: string, input: unknown): { what: What; where: string } | undefined => {
  if (tool !== 'Write' && tool !== 'Edit') {
    return undefined
  }

  const path = fieldOf(input, 'file_path')

  if (SKIP_PATH.test(path)) {
    return undefined
  }

  const lines = addedLines(tool, input)
  const rule = RULES.find(
    candidate =>
      candidate.on === 'text' && (candidate.path?.test(path) ?? true) && lines.some(line => !isClean(candidate, line)),
  )

  return rule === undefined ? undefined : { what: rule.what, where: path }
}

// The confirmation reason, in the session's language; undefined when the action is fine.
const reasonFor = async ($: EngineInterface, tool: string, input: unknown): Promise<string | undefined> => {
  const found = finding(tool, input)

  if (found === undefined) {
    return undefined
  }

  const s = await strings($)

  return s[found.what](found.where)
}

export const register: Register = on => {
  // Does not block: asks the person, even when permissions already allow the call.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    const reason = verdict.decision === 'allow' ? await reasonFor($, e.tool, e.input) : undefined

    return reason === undefined ? verdict : { decision: 'ask', reason }
  }).catch(() => ({ decision: 'ask', reason: STRINGS.en.failed }))
}
