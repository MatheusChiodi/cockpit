import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const git = ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['git', '--no-pager', ...args], { timeoutMs: 15000 }).catch(() => undefined)

const gh = ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['gh', ...args], { timeoutMs: 30000 }).catch(() => undefined)

const SEMVER = /^(v?)(\d+)\.(\d+)\.(\d+)$/
const TAG = /^[A-Za-z0-9][\w.-]*$/
const MAX_SHOWN = 8
const FIRST_RELEASE_COMMITS = 30

const nextPatch = (latest: string | undefined): string | undefined => {
  if (latest === undefined) {
    return 'v0.0.1'
  }

  const found = SEMVER.exec(latest)

  return found === null ? undefined : `${found[1]}${found[2]}.${found[3]}.${Number(found[4]) + 1}`
}

const releasing = async ($: EngineInterface, typed: string): Promise<{ text: string }> => {
  const s = await strings($)

  if (typed !== '' && !TAG.test(typed)) {
    return { text: s.usage }
  }

  const head = await git($, ['rev-parse', '--short', 'HEAD'])

  if (head === undefined || head.exitCode !== 0) {
    return { text: s.noGit }
  }

  const described = await git($, ['describe', '--tags', '--abbrev=0'])
  const latest = described?.exitCode === 0 ? described.stdout.trim() : undefined
  const tag = typed !== '' ? typed : nextPatch(latest)

  if (tag === undefined) {
    return { text: s.usage }
  }

  const log = await git($, [
    'log',
    '--no-merges',
    '--format=- %s (%h)',
    ...(latest === undefined ? ['-n', String(FIRST_RELEASE_COMMITS)] : [`${latest}..HEAD`]),
  ])
  const lines = log?.exitCode === 0 ? log.stdout.split('\n').filter(line => line.trim() !== '') : []

  if (lines.length === 0) {
    return { text: s.nothing(latest ?? 'HEAD') }
  }

  const known = await gh($, ['release', 'view', tag, '--json', 'tagName'])

  if (known === undefined || (known.exitCode !== 0 && !/not found/i.test(known.stderr))) {
    return { text: s.noGh }
  }

  if (known.exitCode === 0) {
    return { text: s.exists(tag) }
  }

  const shown = lines.slice(0, MAX_SHOWN).map(line => `  ${line}`)
  const more = lines.length > MAX_SHOWN ? [`  … +${lines.length - MAX_SHOWN}`] : []
  const answer = await $.ui
    .ask(s.confirm(tag, lines.length, [...shown, ...more].join('\n')), [s.yes, s.asDraft, s.no])
    .catch(() => s.no)

  if (answer !== s.yes && answer !== s.asDraft) {
    return { text: s.cancelled }
  }

  const notes = `## What's changed\n\n${lines.join('\n')}\n`
  const made = await gh($, ['release', 'create', tag, '--title', tag, '--notes', notes, ...(answer === s.asDraft ? ['--draft'] : [])])

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
    await $.command.register({ name: 'release', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'release' }, ($, e) => releasing($, e.args.trim()))
}
