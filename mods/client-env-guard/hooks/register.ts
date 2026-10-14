import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

type Stack = { vite: boolean; next: boolean }

// Read once per module load. A Vite project with its own envPrefix is not judged.
const cache: { stack: Stack | undefined } = { stack: undefined }

const detect = async ($: EngineInterface): Promise<Stack> => {
  const root = await $.session.root()
  const manifest = await $.fs.read(`${root}/package.json`).catch(() => undefined)
  let deps: string[] = []

  try {
    const parsed = JSON.parse(typeof manifest === 'string' ? manifest : '{}') as Record<string, object | undefined>
    deps = [...Object.keys(parsed.dependencies ?? {}), ...Object.keys(parsed.devDependencies ?? {})]
  } catch {
    // Invalid package.json: no stack detected.
  }

  let vite = deps.includes('vite')

  if (vite) {
    for (const file of ['vite.config.ts', 'vite.config.js', 'vite.config.mts', 'vite.config.mjs']) {
      const config = await $.fs.read(`${root}/${file}`).catch(() => undefined)

      if (typeof config === 'string' && config.includes('envPrefix')) {
        vite = false
      }
    }
  }

  return { vite, next: deps.includes('next') }
}

const SOURCE = /\.(?:[cm]?[jt]sx?|vue|svelte)$/i
const NOT_BROWSER = /\.(?:config|test|spec|d)\.|\/(?:server|api|scripts)\//i
const VITE_BUILT_IN = new Set(['MODE', 'DEV', 'PROD', 'SSR', 'BASE_URL'])
const CLIENT_DIRECTIVE = /^\s*(?:(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)\s*)*['"]use client['"]/

type Problem = { kind: 'viteHidden' | 'viteProcess' | 'nextHidden'; name: string }

const problemsIn = (stack: Stack, path: string, text: string): Problem[] => {
  const found: Problem[] = []
  const slashed = path.replaceAll('\\', '/')

  if (stack.vite && slashed.includes('/src/') && !NOT_BROWSER.test(slashed)) {
    for (const match of text.matchAll(/\bimport\.meta\.env\.([A-Za-z_]\w*)/g)) {
      const name = match[1] ?? ''

      if (!name.startsWith('VITE_') && !VITE_BUILT_IN.has(name)) {
        found.push({ kind: 'viteHidden', name })
      }
    }

    for (const match of text.matchAll(/\bprocess\.env\.([A-Za-z_]\w*)/g)) {
      const name = match[1] ?? ''

      if (name !== 'NODE_ENV') {
        found.push({ kind: 'viteProcess', name })
      }
    }
  }

  if (stack.next && CLIENT_DIRECTIVE.test(text)) {
    for (const match of text.matchAll(/\bprocess\.env\.([A-Za-z_]\w*)/g)) {
      const name = match[1] ?? ''

      if (name !== 'NODE_ENV' && !name.startsWith('NEXT_PUBLIC_')) {
        found.push({ kind: 'nextHidden', name })
      }
    }
  }

  return found
}

const relative = async ($: EngineInterface, path: string): Promise<string> => {
  const root = (await $.session.root()).replaceAll('\\', '/')
  const slashed = path.replaceAll('\\', '/')

  return slashed.toLowerCase().startsWith(`${root.toLowerCase()}/`) ? slashed.slice(root.length + 1) : slashed
}

// Why the edit is refused; undefined when it adds no variable the browser would never see.
const verdict = async ($: EngineInterface, path: string, before: string, after: string): Promise<string | undefined> => {
  cache.stack ??= await detect($)

  if (!SOURCE.test(path) || (!cache.stack.vite && !cache.stack.next)) {
    return undefined
  }

  const had = new Set(problemsIn(cache.stack, path, before).map(problem => `${problem.kind}:${problem.name}`))
  const added = problemsIn(cache.stack, path, after).find(problem => !had.has(`${problem.kind}:${problem.name}`))

  return added === undefined ? undefined : (await strings($))[added.kind](added.name, await relative($, path))
}

export const register: Register = on => {
  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const before = (await $.fs.read(e.file_path).catch(() => undefined)) ?? ''
    const deny = await verdict($, e.file_path, typeof before === 'string' ? before : '', e.content)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const current = await $.fs.read(e.file_path).catch(() => undefined)
    const before = typeof current === 'string' ? current : e.old_string
    const after =
      typeof current === 'string'
        ? e.replace_all === true
          ? current.split(e.old_string).join(e.new_string)
          : current.replace(e.old_string, () => e.new_string)
        : e.new_string
    const deny = await verdict($, e.file_path, before, after)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
