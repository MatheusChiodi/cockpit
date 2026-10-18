import type { EngineInterface, Register } from 'claude-code'

const WANTED = /^(test|tests|lint|build|dev|start|typecheck|check|format|e2e|serve|preview)(:|$)/
const MAX_SCRIPTS = 10
const MAX_COMMAND = 90
const SECRET = /(token|secret|passw|api[_-]?key)\w*\s*=|--(token|password)\b/i

// Read once per module load; an edit of package.json or a lockfile clears it.
// The section is read by the model only: English, not translated.
const cache: { text: string | undefined } = { text: undefined }

const WATCHED = /(^|[\\/])(package\.json|pnpm-lock\.yaml|yarn\.lock|package-lock\.json|bun\.lockb?)$/

const LOCKFILES: readonly (readonly [string, string])[] = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lockb', 'bun'],
  ['bun.lock', 'bun'],
  ['package-lock.json', 'npm'],
]

const managerOf = async ($: EngineInterface, root: string, field: unknown): Promise<string> => {
  if (typeof field === 'string' && field !== '') {
    return field.split('@')[0] ?? 'npm'
  }

  for (const [file, manager] of LOCKFILES) {
    if (await $.fs.exists(`${root}/${file}`)) {
      return manager
    }
  }

  return 'npm'
}

const describe = async ($: EngineInterface): Promise<string> => {
  const root = await $.session.root()
  const text = await $.fs.read(`${root}/package.json`).catch(() => undefined)

  if (typeof text !== 'string') {
    return ''
  }

  try {
    const manifest = JSON.parse(text) as { scripts?: Record<string, unknown>; packageManager?: unknown }
    const lines = Object.entries(manifest.scripts ?? {})
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .filter(([name, command]) => WANTED.test(name) && !SECRET.test(command))
      .slice(0, MAX_SCRIPTS)
      .map(([name, command]) => `- ${name}: ${command.length > MAX_COMMAND ? `${command.slice(0, MAX_COMMAND)}…` : command}`)

    return lines.length === 0
      ? ''
      : `# Project scripts (package.json, run with ${await managerOf($, root, manifest.packageManager)})\n${lines.join('\n')}`
  } catch {
    return ''
  }
}

const forget = (path: string): void => {
  if (WATCHED.test(path)) {
    cache.text = undefined
  }
}

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    cache.text ??= await describe($)

    return cache.text === ''
      ? composed
      : { sections: [...composed.sections, { id: 'scripts-context:scripts', text: cache.text, scope: 'session' }] }
  })

  on('tool.call', { tool: 'Edit' }, async (_$, e, next) => {
    const ran = await next(e)
    forget(e.file_path)

    return ran
  })

  on('tool.call', { tool: 'Write' }, async (_$, e, next) => {
    const ran = await next(e)
    forget(e.file_path)

    return ran
  })
}
