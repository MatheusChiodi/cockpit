import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const SOURCE = /\.(?:[cm]?[jt]sx?|vue|svelte)$/i
const DEEP = 3

type Alias = { key: string; prefix: string; dir: string }

// Read once per module load: the aliases of tsconfig.json or jsconfig.json, none when there are no paths.
const cache: { aliases: Alias[] | undefined } = { aliases: undefined }

// tsconfig and jsconfig allow comments and trailing commas.
const stripJsonc = (text: string): string => {
  let out = ''
  let inString = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i] ?? ''
    const next = text[i + 1]

    if (inString) {
      out += c
      inString = !(c === '"' && text[i - 1] !== '\\')
    } else if (c === '"') {
      out += c
      inString = true
    } else if (c === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') {
        i++
      }
    } else if (c === '/' && next === '*') {
      i = text.indexOf('*/', i + 2)
      i = i === -1 ? text.length : i + 1
    } else {
      out += c
    }
  }

  return out.replace(/,(\s*[}\]])/g, '$1')
}

// Folds ./ and ../ out of a slash path; undefined when it climbs above the start.
const fold = (parts: readonly string[]): string[] | undefined => {
  const out: string[] = []

  for (const part of parts) {
    if (part === '..') {
      if (out.pop() === undefined) {
        return undefined
      }
    } else if (part !== '.' && part !== '') {
      out.push(part)
    }
  }

  return out
}

const detect = async ($: EngineInterface): Promise<Alias[]> => {
  const root = await $.session.root()

  for (const file of ['tsconfig.json', 'jsconfig.json']) {
    const text = await $.fs.read(`${root}/${file}`).catch(() => undefined)

    try {
      const options = (JSON.parse(stripJsonc(typeof text === 'string' ? text : '{}')) as { compilerOptions?: Record<string, any> }).compilerOptions
      const entries = Object.entries((options?.paths ?? {}) as Record<string, unknown>)
      const base = typeof options?.baseUrl === 'string' ? options.baseUrl : '.'
      const aliases: Alias[] = []

      for (const [key, targets] of entries) {
        const target = Array.isArray(targets) ? targets[0] : undefined

        if (key.endsWith('/*') && typeof target === 'string' && target.endsWith('/*')) {
          const dir = fold([...base.split('/'), ...target.slice(0, -2).split('/')])

          if (dir !== undefined) {
            aliases.push({ key, prefix: key.slice(0, -1), dir: dir.length === 0 ? '' : `${dir.join('/')}/` })
          }
        }
      }

      if (aliases.length > 0) {
        return aliases
      }
    } catch {
      // Unreadable config: try the next file.
    }
  }

  return []
}

const IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(['"])(\.\.?\/[^'"\n]*)\1/g

const specsIn = (text: string): Set<string> => new Set([...text.matchAll(IMPORT)].map(match => match[2] ?? ''))

const relative = async ($: EngineInterface, path: string): Promise<string | undefined> => {
  const root = (await $.session.root()).replaceAll('\\', '/')
  const slashed = path.replaceAll('\\', '/')

  return slashed.toLowerCase().startsWith(`${root.toLowerCase()}/`) ? slashed.slice(root.length + 1) : undefined
}

// Why the edit is refused; undefined when it adds no deep relative import that an alias covers.
const verdict = async ($: EngineInterface, path: string, before: string, after: string): Promise<string | undefined> => {
  cache.aliases ??= await detect($)
  const rel = await relative($, path)

  if (cache.aliases.length === 0 || rel === undefined || !SOURCE.test(rel)) {
    return undefined
  }

  const known = specsIn(before)
  const from = rel.split('/').slice(0, -1)

  for (const spec of specsIn(after)) {
    const levels = spec.split('/').filter(part => part === '..').length

    if (known.has(spec) || levels < DEEP) {
      continue
    }

    const resolved = fold([...from, ...spec.split('/')])?.join('/')
    const alias = resolved === undefined ? undefined : cache.aliases.filter(item => resolved.startsWith(item.dir)).sort((a, b) => b.dir.length - a.dir.length)[0]

    if (resolved !== undefined && alias !== undefined) {
      return (await strings($)).denied(spec, rel, levels, alias.key, `${alias.prefix}${resolved.slice(alias.dir.length)}`)
    }
  }

  return undefined
}

export const register: Register = on => {
  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const before = await $.fs.read(e.file_path).catch(() => undefined)
    const deny = await verdict($, e.file_path, typeof before === 'string' ? before : '', e.content)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const deny = await verdict($, e.file_path, e.old_string, e.new_string)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
