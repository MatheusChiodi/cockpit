import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const git = ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['git', '--no-pager', ...args], { timeoutMs: 15000 }).catch(() => undefined)

const KEEP = new Set(['main', 'master', 'develop', 'dev'])

type Candidate = { name: string; force: boolean }

const cleaning = async ($: EngineInterface): Promise<{ text: string }> => {
  const s = await strings($)
  const refs = await git($, ['for-each-ref', '--format=%(refname:short) %(objectname)', 'refs/heads'])

  if (refs === undefined || refs.exitCode !== 0) {
    return { text: s.noGit }
  }

  const current = await git($, ['branch', '--show-current'])
  const head = await git($, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])
  const base = head?.exitCode === 0 && head.stdout.trim() !== '' ? head.stdout.trim() : 'origin/main'
  const merged = await git($, ['branch', '--merged', base, '--format=%(refname:short)'])
  const mergedNames = new Set(merged?.exitCode === 0 ? merged.stdout.split('\n').map(line => line.trim()) : [])
  // A squash or rebase merge leaves the branch "unmerged" to git: the pull request says otherwise.
  const prs = await $.process
    .run(['gh', 'pr', 'list', '--state', 'merged', '--limit', '100', '--json', 'headRefName,headRefOid'], { timeoutMs: 30000 })
    .catch(() => undefined)
  let landed: { headRefName: string; headRefOid: string }[] = []

  try {
    landed = prs?.exitCode === 0 ? (JSON.parse(prs.stdout) as typeof landed) : []
  } catch {
    landed = []
  }

  const candidates: Candidate[] = []

  for (const line of refs.stdout.split('\n')) {
    const [name = '', sha = ''] = line.trim().split(' ')

    if (name === '' || name === current?.stdout.trim() || KEEP.has(name) || name === base.replace(/^origin\//, '')) {
      continue
    }

    if (mergedNames.has(name)) {
      candidates.push({ name, force: false })
    } else if (landed.some(pr => pr.headRefName === name && pr.headRefOid === sha)) {
      // Only when the tip is the commit that was merged: later local work is never thrown away.
      candidates.push({ name, force: true })
    }
  }

  if (candidates.length === 0) {
    return { text: s.none }
  }

  const answer = await $.ui
    .ask(s.confirm(candidates.length, candidates.map(c => c.name).join(', ')), [s.yes, s.no])
    .catch(() => s.no)

  if (answer !== s.yes) {
    return { text: s.cancelled }
  }

  const failed: string[] = []

  for (const candidate of candidates) {
    const ran = await git($, ['branch', candidate.force ? '-D' : '-d', candidate.name])

    if (ran === undefined || ran.exitCode !== 0) {
      failed.push(candidate.name)
    }
  }

  const count = candidates.length - failed.length

  return { text: failed.length === 0 ? s.deleted(count) : s.partial(count, failed.join(', ')) }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'merged', description: s.command })

    return next(e)
  })

  on('command.run', { command: 'merged' }, $ => cleaning($))
}
