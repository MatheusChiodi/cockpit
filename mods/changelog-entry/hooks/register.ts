import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const git = ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['git', '--no-pager', ...args], { timeoutMs: 15000 }).catch(() => undefined)

const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)$/
const VERSION = /^v?(\d+\.\d+\.\d+[\w.-]*)$/
const CONVENTIONAL = /^(\w+)(\([^)]*\))?(!)?:\s*(.+)$/
const MAX_SHOWN = 12

// The sections follow keepachangelog.com, so they stay in English in every language.
const group = (subject: string): { section: string; text: string; breaking: boolean } => {
  const found = CONVENTIONAL.exec(subject)
  const type = found?.[1]?.toLowerCase()
  const text = found?.[4] ?? subject
  const breaking = found?.[3] === '!' || /BREAKING/.test(subject)

  return { section: type === 'feat' ? 'Added' : type === 'fix' ? 'Fixed' : 'Changed', text, breaking }
}

const nextVersion = (latest: string | undefined, entries: ReturnType<typeof group>[]): string => {
  const found = latest === undefined ? null : SEMVER.exec(latest)

  if (found === null) {
    return '0.1.0'
  }

  const [major = 0, minor = 0, patch = 0] = found.slice(1).map(Number)

  if (entries.some(entry => entry.breaking)) {
    return `${major + 1}.0.0`
  }

  return entries.some(entry => entry.section === 'Added') ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`
}

const writing = async ($: EngineInterface, typed: string): Promise<{ text: string }> => {
  const s = await strings($)
  const typedVersion = VERSION.exec(typed)

  if (typed !== '' && typedVersion === null) {
    return { text: s.usage }
  }

  const head = await git($, ['rev-parse', '--short', 'HEAD'])

  if (head === undefined || head.exitCode !== 0) {
    return { text: s.noGit }
  }

  const described = await git($, ['describe', '--tags', '--abbrev=0'])
  const latest = described?.exitCode === 0 ? described.stdout.trim() : undefined
  const log = await git($, ['log', '--no-merges', '--format=%s', ...(latest === undefined ? ['-n', '30'] : [`${latest}..HEAD`])])
  const entries = (log?.exitCode === 0 ? log.stdout.split('\n') : []).filter(line => line.trim() !== '').map(group)

  if (entries.length === 0) {
    return { text: s.nothing(latest ?? 'HEAD') }
  }

  const version = typedVersion?.[1] ?? nextVersion(latest, entries)
  const root = await $.session.root()
  const path = `${root}/CHANGELOG.md`
  const current = await $.fs.read(path).catch(() => undefined)
  const file = typeof current === 'string' ? current : ''

  if (file.includes(`## [${version}]`)) {
    return { text: s.exists(version) }
  }

  const date = new Date(await $.clock.now()).toISOString().slice(0, 10)
  const sections = ['Added', 'Fixed', 'Changed']
    .map(section => ({ section, items: entries.filter(entry => entry.section === section) }))
    .filter(found => found.items.length > 0)
    .map(found => `### ${found.section}\n\n${found.items.map(entry => `- ${entry.text}`).join('\n')}\n`)
  const entry = `## [${version}] - ${date}\n\n${sections.join('\n')}`
  const shown = entry.split('\n').filter(line => line.trim() !== '')
  const preview = [...shown.slice(0, MAX_SHOWN), ...(shown.length > MAX_SHOWN ? ['…'] : [])].map(line => `  ${line}`).join('\n')
  const answer = await $.ui.ask(s.confirm(preview), [s.yes, s.no]).catch(() => s.no)

  if (answer !== s.yes) {
    return { text: s.cancelled }
  }

  // New entries go above the newest existing one, or after the title of a file that has none.
  const at = file.search(/^## /m)
  const next =
    file === ''
      ? `# Changelog\n\n${entry}`
      : at >= 0
        ? `${file.slice(0, at)}${entry}\n${file.slice(at)}`
        : `${file.trimEnd()}\n\n${entry}`
  const saved = await $.fs.write(path, next).then(
    () => true,
    () => false,
  )

  return { text: saved ? s.added(version) : s.failed }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'changelog', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'changelog' }, ($, e) => writing($, e.args.trim()))
}
