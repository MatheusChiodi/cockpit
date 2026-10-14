import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// Read once per module load: null when the folder has no readable package.json.
const cache: { scripts: string[] | null | undefined } = { scripts: undefined }

const detect = async ($: EngineInterface): Promise<string[] | null> => {
  const root = await $.session.root()
  const manifest = await $.fs.read(`${root}/package.json`).catch(() => undefined)

  if (typeof manifest !== 'string') {
    return null
  }

  try {
    const scripts = (JSON.parse(manifest) as { scripts?: unknown }).scripts

    return scripts !== null && typeof scripts === 'object' ? Object.keys(scripts) : []
  } catch {
    return null
  }
}

// npm and pnpm only run declared scripts; yarn and bun also run binaries and files, so they are left alone.
const SEGMENT = /^(?:\w+=\S+\s+)*(npm|pnpm)\s+(run-script|run|test|t)\b\s*(.*)$/
// Anything that moves the lookup to another package.json, or makes the missing script acceptable.
const ELSEWHERE = /(^|\s)(-w|--workspaces?|--prefix|-C|--dir|--filter|-F|-r|--recursive|--if-present)(\s|=|$)|\bcd\s/

const missingScript = (command: string, known: readonly string[]): string | undefined => {
  if (ELSEWHERE.test(command)) {
    return undefined
  }

  for (const part of command.split(/&&|\|\||;|\||\n/)) {
    const match = SEGMENT.exec(part.trim())

    if (match === null) {
      continue
    }

    const name = match[2] === 'run' || match[2] === 'run-script' ? (match[3] ?? '').split(/\s+/)[0] ?? '' : 'test'

    // A name that is not plain (a pattern, an option, nothing at all) is not judged.
    if (/^[\w:.@/-]+$/.test(name) && !name.startsWith('-') && !known.includes(name)) {
      return name
    }
  }

  return undefined
}

const verdict = async ($: EngineInterface, command: string): Promise<string | undefined> => {
  if (cache.scripts === undefined) {
    cache.scripts = await detect($)
  }

  if (cache.scripts === null) {
    return undefined
  }

  const name = missingScript(command, cache.scripts)

  return name === undefined ? undefined : (await strings($)).denied(name, cache.scripts.join(', '))
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
