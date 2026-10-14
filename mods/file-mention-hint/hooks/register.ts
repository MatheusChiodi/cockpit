import type { EngineInterface, Register } from 'claude-code'

const MAX_PATHS = 5

const EXTENSIONS =
  'tsx?|jsx?|mjs|cjs|py|java|kt|go|rs|rb|php|cs|cpp|hpp|c|h|swift|vue|svelte|scss|css|html|json|ya?ml|toml|sql|sh|md'

// A bare file name: not after "@" or a path separator, and no path inside it.
const NAME = new RegExp(`(?:^|[\\s("'\`,])([\\w-][\\w.-]*\\.(?:${EXTENSIONS}))(?=$|[\\s)"'\`,:;?!]|\\.(?:\\s|$))`, 'g')

const named = (text: string): Set<string> => new Set([...text.matchAll(NAME)].map(found => found[1] as string))

const locate = async ($: EngineInterface, names: Set<string>): Promise<string[]> => {
  const ran = await $.process.run(['git', 'ls-files'], { timeoutMs: 5000 }).catch(() => undefined)

  if (ran === undefined || ran.exitCode !== 0) {
    return []
  }

  return ran.stdout
    .split('\n')
    .map(line => line.trim())
    .filter(path => path !== '' && names.has(path.split('/').pop() as string))
    .slice(0, MAX_PATHS)
}

export const register: Register = on => {
  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind !== 'composer' || e.text.startsWith('/')) {
      return next(e)
    }

    const names = named(e.text)

    if (names.size === 0) {
      return next(e)
    }

    const paths = await locate($, names)

    return paths.length === 0
      ? next(e)
      : next({ ...e, context: [...(e.context ?? []), `Files matching names in the prompt (open these first):\n${paths.map(path => `- ${path}`).join('\n')}`] })
  })
}
