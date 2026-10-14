import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const git = ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['git', '--no-pager', ...args], { timeoutMs: 15000 }).catch(() => undefined)

const gh = ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['gh', ...args], { timeoutMs: 30000 }).catch(() => undefined)

const humanize = (branch: string): string => {
  const words = (branch.split('/').pop() ?? branch).replace(/[-_]+/g, ' ').trim()

  return words.charAt(0).toUpperCase() + words.slice(1)
}

const opening = async ($: EngineInterface, typed: string): Promise<{ text: string }> => {
  const s = await strings($)
  const current = await git($, ['rev-parse', '--abbrev-ref', 'HEAD'])
  const branch = current?.exitCode === 0 ? current.stdout.trim() : ''
  const listed = await gh($, ['pr', 'list', '--head', branch, '--state', 'open', '--json', 'number,url', '--limit', '1'])

  if (branch === '' || listed === undefined || listed.exitCode !== 0) {
    return { text: s.noGh }
  }

  let open: { number: number; url: string }[] = []

  try {
    open = JSON.parse(listed.stdout) as { number: number; url: string }[]
  } catch {
    open = []
  }

  if (open[0] !== undefined) {
    return { text: s.exists(open[0].number, open[0].url) }
  }

  const head = await git($, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])
  const base = head?.exitCode === 0 && head.stdout.trim() !== '' ? head.stdout.trim().replace(/^origin\//, '') : 'main'

  if (branch === base) {
    return { text: s.onBase(branch) }
  }

  const upstream = await git($, ['rev-parse', '--abbrev-ref', '@{u}'])

  if (upstream === undefined || upstream.exitCode !== 0) {
    return { text: s.pushFirst(branch) }
  }

  const log = await git($, ['log', '--reverse', '--format=%s', `origin/${base}..HEAD`])
  const subjects = log?.exitCode === 0 ? log.stdout.split('\n').filter(line => line.trim() !== '') : []

  if (subjects.length === 0) {
    return { text: s.noCommits(base) }
  }

  const title = typed !== '' ? typed : subjects.length === 1 ? (subjects[0] ?? branch) : humanize(branch)
  const body = `## Summary\n\n${subjects.map(subject => `- ${subject}`).join('\n')}\n`
  const answer = await $.ui.ask(s.confirm(title, base, subjects.length), [s.yes, s.asDraft, s.no]).catch(() => s.no)

  if (answer !== s.yes && answer !== s.asDraft) {
    return { text: s.cancelled }
  }

  const made = await gh($, [
    'pr', 'create', '--base', base, '--head', branch, '--title', title, '--body', body,
    ...(answer === s.asDraft ? ['--draft'] : []),
  ])

  if (made === undefined) {
    return { text: s.noGh }
  }

  return {
    text:
      made.exitCode === 0
        ? s.created(made.stdout.trim().split('\n').pop() ?? '')
        : s.failed((made.stderr || made.stdout).trim().split('\n')[0] ?? ''),
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'prnew', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'prnew' }, ($, e) => opening($, e.args.trim()))
}
