import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const TOAST_MS = 8000
const SOURCE = /\.(?:[cm]?[jt]sx?|vue|svelte|astro)$/i

// Variables the platform or the bundler provides: never declared by hand.
const PROVIDED = new Set(['NODE_ENV', 'CI', 'PWD', 'HOME', 'PATH', 'TZ', 'DEBUG', 'MODE', 'DEV', 'PROD', 'SSR', 'BASE_URL', 'NEXT_RUNTIME'])
const PROVIDED_PREFIX = /^(?:npm_|VERCEL|NETLIFY|GITHUB_|RENDER|CF_PAGES)/

// The files that declare the variables: the committed example when there is one, else the real ones.
const EXAMPLES = ['.env.example', '.env.sample', '.env.template', '.env.local.example', '.env.dist']
const REAL = ['.env', '.env.local', '.env.development']

// Read once per module load: whether the folder is a JavaScript project. The names already reported live here too.
const cache: { isJs: boolean | undefined; warned: Set<string> } = { isJs: undefined, warned: new Set() }

// Only the names of the keys are read from an env file, never a value.
const keysOf = async ($: EngineInterface, root: string, files: readonly string[]): Promise<{ file: string; keys: Set<string> } | undefined> => {
  const found: string[] = []
  const keys = new Set<string>()

  for (const file of files) {
    const text = await $.fs.read(`${root}/${file}`).catch(() => undefined)

    if (typeof text === 'string') {
      found.push(file)

      for (const match of text.matchAll(/^\s*(?:export\s+)?([A-Za-z_]\w*)\s*=/gm)) {
        keys.add(match[1] ?? '')
      }
    }
  }

  return found.length === 0 ? undefined : { file: found[0] ?? '', keys }
}

const USE = /\b(?:process\.env|import\.meta\.env)(?:\.([A-Za-z_]\w*)|\[\s*['"]([A-Za-z_]\w*)['"]\s*\])/g

const usedIn = (text: string): Set<string> => {
  const names = new Set<string>()

  for (const match of text.matchAll(USE)) {
    const name = match[1] ?? match[2] ?? ''

    if (!PROVIDED.has(name) && !PROVIDED_PREFIX.test(name)) {
      names.add(name)
    }
  }

  return names
}

const check = async ($: EngineInterface, path: string, before: string, after: string): Promise<void> => {
  if (!SOURCE.test(path)) {
    return
  }

  const root = await $.session.root()

  if (cache.isJs === undefined) {
    cache.isJs = typeof (await $.fs.read(`${root}/package.json`).catch(() => undefined)) === 'string'
  }

  const had = usedIn(before)
  const added = [...usedIn(after)].filter(name => !had.has(name) && !cache.warned.has(name))

  if (!cache.isJs || added.length === 0) {
    return
  }

  const declared = (await keysOf($, root, EXAMPLES)) ?? (await keysOf($, root, REAL))
  const missing = declared === undefined ? [] : added.filter(name => !declared.keys.has(name))

  if (declared === undefined || missing.length === 0) {
    return
  }

  for (const name of missing) {
    cache.warned.add(name)
  }

  const names = missing.length > 3 ? `${missing.slice(0, 3).join(', ')} +${missing.length - 3}` : missing.join(', ')
  $.ui.toast((await strings($)).undeclared(names, declared.file), { timeoutMs: TOAST_MS })
}

export const register: Register = on => {
  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const before = await $.fs.read(e.file_path).catch(() => undefined)
    const ran = await next(e)

    if (ran.deny === undefined) {
      await check($, e.file_path, typeof before === 'string' ? before : '', e.content)
    }

    return ran
  })

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny === undefined) {
      await check($, e.file_path, e.old_string, e.new_string)
    }

    return ran
  })
}
