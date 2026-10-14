import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const git = ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['git', '--no-pager', ...args], { timeoutMs: 15000 }).catch(() => undefined)

const SEMVER = /^v(\d+)\.(\d+)\.(\d+)$/

const bump = (tag: string, level: string): string | undefined => {
  const found = SEMVER.exec(tag)

  if (found === null) {
    return undefined
  }

  const [major = 0, minor = 0, patch = 0] = found.slice(1).map(Number)

  return level === 'major' ? `v${major + 1}.0.0` : level === 'minor' ? `v${major}.${minor + 1}.0` : `v${major}.${minor}.${patch + 1}`
}

const tagging = async ($: EngineInterface, level: string): Promise<{ text: string }> => {
  const s = await strings($)
  const head = await git($, ['log', '-1', '--format=%h %s'])

  if (head === undefined || head.exitCode !== 0) {
    return { text: s.noGit }
  }

  const described = await git($, ['describe', '--tags', '--abbrev=0'])
  const latest = described?.exitCode === 0 ? described.stdout.trim() : undefined

  if (latest === undefined) {
    return level === '' ? { text: s.noTags } : create($, 'v0.0.1', head.stdout.trim())
  }

  const since = await git($, ['rev-list', '--count', `${latest}..HEAD`])
  const commits = Number.parseInt(since?.stdout.trim() ?? '', 10) || 0

  if (level === '') {
    return { text: s.summary(latest, commits) }
  }

  if (commits === 0) {
    return { text: s.alreadyTagged(latest) }
  }

  const next = bump(latest, level)

  return next === undefined ? { text: s.notSemver(latest) } : create($, next, head.stdout.trim())
}

const create = async ($: EngineInterface, tag: string, commit: string): Promise<{ text: string }> => {
  const s = await strings($)
  const answer = await $.ui.ask(s.confirm(tag, commit), [s.yes, s.no]).catch(() => s.no)

  if (answer !== s.yes) {
    return { text: s.cancelled }
  }

  const ran = await git($, ['tag', '-a', tag, '-m', tag])

  if (ran === undefined) {
    return { text: s.noGit }
  }

  return { text: ran.exitCode === 0 ? s.created(tag) : s.failed((ran.stderr || ran.stdout).trim().split('\n')[0] ?? '') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'gtag', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'gtag' }, async ($, e) => {
    const level = e.args.trim().toLowerCase()

    return level === '' || level === 'patch' || level === 'minor' || level === 'major'
      ? tagging($, level)
      : { text: (await strings($)).usage }
  })
}
