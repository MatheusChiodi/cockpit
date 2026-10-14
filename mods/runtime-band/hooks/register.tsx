import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { row } from './kit'
import { STRINGS } from './strings'

import type { Mismatch } from '../types'

// cockpit: switched on and off in the /cockpit pane
const OFF = { plugin: 'cockpit', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('runtime-band')

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const found = atom({ plugin: 'runtime-band', key: 'found' } as const, [])

// Version managers: a command that may change the version in use.
const SWITCH = /\b(nvm|fnm|volta|pyenv|asdf|mise|sdk|conda|use)\b/

type Wanted = { tool: string; want: string }

const clean = (text: string | undefined): string | undefined => {
  const value = text?.split('\n')[0]?.trim().replace(/^v/, '')

  return value === undefined || value === '' ? undefined : value
}

const readText = async ($: EngineInterface, path: string): Promise<string | undefined> =>
  $.fs.read(path).catch(() => undefined)

// What the project asks for, from the version files and package.json engines.
const wanted = async ($: EngineInterface, root: string): Promise<Wanted[]> => {
  const asks = new Map<string, string>()
  const tools = await readText($, `${root}/.tool-versions`)

  for (const line of (tools ?? '').split('\n')) {
    const [name, version] = line.trim().split(/\s+/)
    const tool = name === 'nodejs' ? 'node' : name

    if (version !== undefined && (tool === 'node' || tool === 'python' || tool === 'java')) {
      asks.set(tool, version)
    }
  }

  const files: readonly (readonly [string, string])[] = [
    ['.nvmrc', 'node'],
    ['.node-version', 'node'],
    ['.python-version', 'python'],
    ['.java-version', 'java'],
  ]

  for (const [file, tool] of files) {
    const want = clean(await readText($, `${root}/${file}`))

    if (want !== undefined) {
      asks.set(tool, want)
    }
  }

  if (!asks.has('node')) {
    try {
      const manifest = JSON.parse((await readText($, `${root}/package.json`)) ?? '{}') as { engines?: { node?: string } }
      const want = manifest.engines?.node

      if (want !== undefined) {
        asks.set('node', want)
      }
    } catch {
      // Invalid package.json: nothing asked.
    }
  }

  return [...asks].map(([tool, want]) => ({ tool, want }))
}

const numbers = (text: string): number[] =>
  (/\d+(?:[._]\d+)*/.exec(text)?.[0] ?? '')
    .split(/[._]/)
    .filter(part => part !== '')
    .map(Number)

// Does the installed version satisfy the ask? Plain versions match by prefix, >= by major, ^ and ~ by major.
const satisfies = (want: string, have: string): boolean => {
  const asked = numbers(want)
  const got = numbers(have)

  if (asked.length === 0 || got.length === 0) {
    return true
  }

  const op = /^\s*(>=|\^|~)/.exec(want)?.[1]

  if (op === '>=') {
    return (got[0] ?? 0) >= (asked[0] ?? 0)
  }

  if (op === '^' || op === '~') {
    return got[0] === asked[0]
  }

  return asked.every((part, i) => got[i] === part)
}

const installed = async ($: EngineInterface, tool: string): Promise<string | undefined> => {
  const argv = tool === 'java' ? ['java', '-version'] : [tool, '--version']
  const ran = await $.process.run(argv, { timeoutMs: 5000 }).catch(() => undefined)

  if (ran === undefined || ran.exitCode !== 0) {
    return undefined
  }

  const text = `${ran.stdout}\n${ran.stderr}`

  return tool === 'java' ? /version "([^"]+)"/.exec(text)?.[1] : /\d+(?:\.\d+)+/.exec(text)?.[0]
}

const refresh = async ($: EngineInterface): Promise<void> => {
  const root = await $.session.root()
  const mismatches: Mismatch[] = []

  for (const { tool, want } of await wanted($, root)) {
    const have = await installed($, tool)

    if (have !== undefined && !satisfies(want, have)) {
      mismatches.push({ tool, want, have })
    }
  }

  await update($, found, held => (JSON.stringify(held) === JSON.stringify(mismatches) ? held : mismatches))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refresh($)
    $.clock.every(600000, () => void refresh($))

    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)

    if (SWITCH.test(e.command)) {
      void refresh($)
    }

    return ran
  })

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const ran = await next(e)

    if (SWITCH.test(e.command)) {
      void refresh($)
    }

    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const mismatches = await read($, found)

    if (e.props.hasSurvey || (await isOff($)) || mismatches.length === 0) {
      return below
    }

    const ui = $.ui.resolve(e)
    const { Text } = ui
    const s = await strings($)

    return row(
      ui,
      'project',
      s.label,
      <Text wrap="truncate-end">
        {mismatches.map(item => (
          <Text>
            <Text color="warning">
              {item.tool} {s.asks} {item.want}
            </Text>
            <Text dimColor>
              {'  '}
              {s.has} {item.have}
              {'   '}
            </Text>
          </Text>
        ))}
      </Text>,
      below,
    )
  })
}
