import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Diff = {
  number?: number
  headRefName?: string
  baseRefName?: string
  additions?: number
  deletions?: number
  changedFiles?: number
  files?: { path: string; additions: number; deletions: number }[]
}

const MAX_LISTED = 25

const diffing = async ($: EngineInterface, typed: string): Promise<{ text: string }> => {
  const s = await strings($)

  if (typed !== '' && !/^\d+$/.test(typed)) {
    return { text: s.usage }
  }

  const ran = await $.process
    .run(['gh', 'pr', 'view', ...(typed === '' ? [] : [typed]), '--json', 'number,headRefName,baseRefName,additions,deletions,changedFiles,files'], {
      timeoutMs: 30000,
    })
    .catch(() => undefined)
  let pr: Diff = {}

  try {
    pr = ran?.exitCode === 0 ? (JSON.parse(ran.stdout) as Diff) : {}
  } catch {
    pr = {}
  }

  if (pr.number === undefined) {
    return { text: s.noGh }
  }

  const files = pr.files ?? []
  const width = Math.max(1, ...files.map(file => String(file.additions).length))
  const rows = files
    .slice(0, MAX_LISTED)
    .map(file => `  +${String(file.additions).padEnd(width)}  -${String(file.deletions).padEnd(width)}  ${file.path}`)
  const rest = files.length - rows.length
  const head = s.head(pr.number, pr.headRefName ?? '?', pr.baseRefName ?? '?', pr.changedFiles ?? files.length, pr.additions ?? 0, pr.deletions ?? 0)

  return { text: [head, ...rows, ...(rest > 0 ? [s.more(rest)] : [])].join('\n') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'prdiff', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'prdiff' }, ($, e) => diffing($, e.args.trim().replace(/^#/, '')))
}
