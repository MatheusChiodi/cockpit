import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// Distinct files edited before the branch is compared with them.
const MIN_FILES = 6
const TOAST_MS = 12000
// Words of a branch name that say the kind of work, not what it is about.
const KINDS = new Set(['feat', 'feature', 'fix', 'bugfix', 'hotfix', 'chore', 'refactor', 'docs', 'test', 'tests', 'release', 'wip', 'task'])
const TRUNKS = new Set(['main', 'master', 'develop', 'dev', 'trunk'])

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Module state: the files edited by the main loop and the branches already told about.
const work: { files: Set<string>; told: Set<string> } = { files: new Set(), told: new Set() }

const topicsOf = (branch: string): string[] =>
  TRUNKS.has(branch.toLowerCase())
    ? []
    : branch
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(word => word.length >= 3 && !KINDS.has(word) && !/^[0-9]+$/.test(word))

const note = (path: string, agentId: unknown): void => {
  if (agentId === undefined) {
    work.files.add(path.toLowerCase())
  }
}

const check = async ($: EngineInterface): Promise<void> => {
  if (work.files.size < MIN_FILES) {
    return
  }

  const ran = await $.process.run(['git', 'branch', '--show-current'], { timeoutMs: 10000 }).catch(() => undefined)
  const branch = ran !== undefined && ran.exitCode === 0 ? ran.stdout.trim() : ''
  const topics = topicsOf(branch)

  if (branch === '' || topics.length === 0 || work.told.has(branch)) {
    return
  }

  if (![...work.files].some(path => topics.some(topic => path.includes(topic)))) {
    work.told.add(branch)
    $.ui.toast((await strings($)).drift(branch, work.files.size), { timeoutMs: TOAST_MS })
  }
}

export const register: Register = on => {
  on('session.start', (_$, e, next) => {
    work.files = new Set()
    work.told = new Set()

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

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined && !e.isAborted) {
      await check($)
    }

    return next(e)
  })
}
