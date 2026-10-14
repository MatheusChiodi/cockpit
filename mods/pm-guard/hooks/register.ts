import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const LOCKFILES = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lockb', 'bun'],
  ['bun.lock', 'bun'],
  ['package-lock.json', 'npm'],
] as const

type Detected = { pm: string; source: string } | null

// Read once per module load: null when the project has no single package manager to enforce.
const cache: { found: Detected | undefined } = { found: undefined }

const detect = async ($: EngineInterface): Promise<Detected> => {
  const root = await $.session.root()
  const manifest = await $.fs.read(`${root}/package.json`).catch(() => undefined)

  if (typeof manifest === 'string') {
    try {
      const declared = (JSON.parse(manifest) as { packageManager?: unknown }).packageManager

      if (typeof declared === 'string') {
        const pm = declared.split('@')[0] ?? ''

        if (['npm', 'pnpm', 'yarn', 'bun'].includes(pm)) {
          return { pm, source: 'package.json packageManager' }
        }
      }
    } catch {
      // Invalid package.json: the lockfiles decide.
    }
  }

  const found: { pm: string; source: string }[] = []

  for (const [file, pm] of LOCKFILES) {
    if (await $.fs.exists(`${root}/${file}`)) {
      found.push({ pm, source: file })
    }
  }

  return found.length === 1 ? (found[0] ?? null) : null
}

const VERBS: Record<string, string> = {
  install: 'install',
  i: 'install',
  ci: 'ci',
  add: 'add',
  remove: 'remove',
  rm: 'remove',
  uninstall: 'remove',
  un: 'remove',
  update: 'update',
  up: 'update',
  upgrade: 'update',
  run: 'run',
  'run-script': 'run',
  test: 'test',
  t: 'test',
  start: 'start',
}

const SEGMENT = /^(?:[\w]+=\S+\s+)*(npm|pnpm|yarn|bun)\b\s*(\S*)\s*(.*)$/

// The same intent written for the project's package manager.
const suggestion = (pm: string, verb: string, rest: string): string => {
  const hasPackages = rest.split(/\s+/).some(word => word !== '' && !word.startsWith('-'))
  const tail = rest === '' ? '' : ` ${rest}`

  switch (verb) {
    case 'install':
      return hasPackages ? (pm === 'npm' ? `npm install${tail}` : `${pm} add${tail}`) : `${pm} install`
    case 'add':
      return pm === 'npm' ? `npm install${tail}` : `${pm} add${tail}`
    case 'ci':
      return pm === 'npm' ? 'npm ci' : `${pm} install --frozen-lockfile`
    case 'remove':
      return pm === 'npm' ? `npm uninstall${tail}` : `${pm} remove${tail}`
    case 'update':
      return pm === 'yarn' ? `yarn upgrade${tail}` : `${pm} update${tail}`
    default:
      return `${pm} ${verb}${tail}`
  }
}

// Why the command is refused; undefined when it matches the project or is not a package manager command.
const verdict = async ($: EngineInterface, command: string): Promise<string | undefined> => {
  cache.found ??= await detect($)

  if (cache.found === null) {
    return undefined
  }

  const { pm, source } = cache.found

  for (const part of command.split(/&&|\|\||;|\||\n/)) {
    const match = SEGMENT.exec(part.trim())
    const tool = match?.[1]

    if (match === null || tool === undefined || tool === pm || /(^|\s)(-g|--global|global)(\s|$)/.test(part)) {
      continue
    }

    const sub = match[2] ?? ''
    const rest = (match[3] ?? '').trim()
    const verb = sub === '' && tool === 'yarn' ? 'install' : VERBS[sub]

    if (verb !== undefined) {
      return (await strings($)).denied(pm, source, part.trim(), suggestion(pm, verb, rest))
    }
  }

  return undefined
}

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const deny = await verdict($, e.command)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const deny = await verdict($, e.command)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
