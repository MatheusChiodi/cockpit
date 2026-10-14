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

// The commands of each manager, in the order the table prints them.
const COMMANDS: Record<string, readonly [string, string, string, string, string, string]> = {
  npm: ['npm install', 'npm install <package>', 'npm uninstall <package>', 'npm run <script>', 'npm exec <bin>', 'npx <package>'],
  pnpm: ['pnpm install', 'pnpm add <package>', 'pnpm remove <package>', 'pnpm run <script>', 'pnpm exec <bin>', 'pnpm dlx <package>'],
  yarn: ['yarn install', 'yarn add <package>', 'yarn remove <package>', 'yarn run <script>', 'yarn exec <bin>', 'yarn dlx <package>'],
  bun: ['bun install', 'bun add <package>', 'bun remove <package>', 'bun run <script>', 'bunx <bin>', 'bunx <package>'],
}

const pm = async ($: EngineInterface): Promise<{ text: string }> => {
  const s = await strings($)
  const root = await $.session.root()
  const manifest = await $.fs.read(`${root}/package.json`).catch(() => undefined)

  if (typeof manifest !== 'string') {
    return { text: s.noPackage }
  }

  let name: string | undefined
  let source = ''

  try {
    const declared = (JSON.parse(manifest) as { packageManager?: unknown }).packageManager
    const declaredName = typeof declared === 'string' ? declared.split('@')[0] : undefined

    if (declaredName !== undefined && declaredName in COMMANDS) {
      name = declaredName
      source = 'package.json packageManager'
    }
  } catch {
    // Invalid package.json: the lockfiles decide.
  }

  const present: (typeof LOCKFILES)[number][] = []

  for (const lock of LOCKFILES) {
    if (await $.fs.exists(`${root}/${lock[0]}`)) {
      present.push(lock)
    }
  }

  const lines: string[] = []

  if (name === undefined) {
    const managers = new Set(present.map(([, manager]) => manager))

    if (managers.size === 1) {
      name = present[0]?.[1]
      source = present[0]?.[0] ?? ''
    } else if (managers.size > 1) {
      lines.push(s.conflict(present.map(([file]) => file).join(', ')))
    }
  }

  const shown = name ?? 'npm'
  const commands = COMMANDS[shown] ?? COMMANDS.npm!
  const labels = Object.values(s.labels)
  const width = Math.max(...labels.map(label => label.length)) + 2

  return {
    text: [
      ...lines,
      name === undefined && lines.length === 0 ? s.none : `${shown}${source === '' ? '' : ` (${source})`}`,
      ...labels.map((label, index) => `${label.padEnd(width)}${commands[index]}`),
    ].join('\n'),
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'pm', description: s.command })

    return next(e)
  })

  on('command.run', { command: 'pm' }, $ => pm($))
}
