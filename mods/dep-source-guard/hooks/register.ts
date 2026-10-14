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
    pattern: /:\s*"(?:git\+|git:\/\/|git@|github:|gitlab:|bitbucket:|ssh:\/\/|https:\/\/[^"]*\.(?:tgz|tar\.gz|zip)")/,
    what: 'remote',
    on: 'text',
    path: /(?:^|[\\/])package\.json$/,
    skip: [/"(?:homepage|url|repository|bugs|funding|author|email|registry)"\s*:/],
  },
  {
    pattern: /:\s*"http:\/\/(?!localhost|127\.0\.0\.1)/,
    what: 'http',
    on: 'text',
    path: /(?:^|[\\/])package\.json$/,
    skip: [/"(?:homepage|url|repository|bugs|funding|author|email|registry)"\s*:/],
  },
  {
    pattern: /^\s*(?:-e\s+)?(?:git\+|https:\/\/)|\bgit\s*=\s*["']/,
    what: 'remote',
    on: 'text',
    path: /(?:requirements[\w.-]*\.txt|Pipfile|pyproject\.toml|Cargo\.toml)$/,
    skip: [/\b(?:homepage|repository|documentation|url|Homepage)\s*=/, /^\s*(?:\/\/|#|\*|\/\*|<!--)/],
  },
  {
    pattern: /\bhttp:\/\/(?!localhost|127\.0\.0\.1)/,
    what: 'http',
    on: 'text',
    path: /(?:requirements[\w.-]*\.txt|Pipfile|pyproject\.toml|Cargo\.toml)$/,
    skip: [/\b(?:homepage|repository|documentation|url|Homepage)\s*=/, /^\s*(?:\/\/|#|\*|\/\*|<!--)/],
  },
  {
    pattern: /\b(?:npm|pnpm|yarn|bun)\s+(?:i|install|add)\b[^|;&\n]*\s(?:git\+|git:\/\/|git@|github:|gitlab:|bitbucket:|ssh:\/\/|https:\/\/\S*\.(?:tgz|tar\.gz|zip)\b)/,
    what: 'remote',
    on: 'command',
  },
  {
    pattern: /\bpip3?\s+install\b[^|;&\n]*\s(?:-e\s+)?(?:git\+|https:\/\/\S*\.(?:zip|tar\.gz|whl)\b)/,
    what: 'remote',
    on: 'command',
  },
  {
    pattern: /\b(?:npm|pnpm|yarn|bun|pip3?)\s+(?:i|install|add)\b[^|;&\n]*\shttp:\/\/(?!localhost|127\.0\.0\.1)/,
    what: 'http',
    on: 'command',
  },
]

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
  if (tool === 'Bash' || tool === 'PowerShell') {
    const command = fieldOf(input, 'command')
    const rule = RULES.find(candidate => candidate.on === 'command' && !isClean(candidate, command))

    return rule === undefined ? undefined : { what: rule.what, where: command.trim().slice(0, 60) }
  }

  if (tool !== 'Write' && tool !== 'Edit') {
    return undefined
  }

  const path = fieldOf(input, 'file_path')

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
