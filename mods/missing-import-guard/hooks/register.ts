import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const SOURCE = /\.(?:[cm]?[jt]sx?|vue|svelte)$/i

const BUILTINS = new Set(
  'assert async_hooks buffer child_process cluster console constants crypto dgram diagnostics_channel dns domain events fs http http2 https inspector module net os path perf_hooks process punycode querystring readline repl stream string_decoder sys timers tls trace_events tty url util v8 vm wasi worker_threads zlib'.split(' '),
)

type Project = { declared: Set<string>; aliases: string[]; baseUrl: string | undefined }

// Read once per module load: null when the folder is not a single-package JavaScript project.
const cache: { project: Project | null | undefined } = { project: undefined }

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

const parse = (text: string | undefined): Record<string, any> | undefined => {
  try {
    return typeof text === 'string' ? (JSON.parse(stripJsonc(text)) as Record<string, any>) : undefined
  } catch {
    return undefined
  }
}

const detect = async ($: EngineInterface): Promise<Project | null> => {
  const root = await $.session.root()
  const manifest = parse(await $.fs.read(`${root}/package.json`).catch(() => undefined))

  // A monorepo declares its packages in each member: the root file alone cannot judge.
  if (manifest === undefined || manifest.workspaces !== undefined) {
    return null
  }

  const declared = new Set<string>()

  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const name of Object.keys(manifest[field] ?? {})) {
      declared.add(name)
      declared.add(name.replace(/^@types\//, ''))
    }
  }

  if (typeof manifest.name === 'string') {
    declared.add(manifest.name)
  }

  const aliases: string[] = []
  let baseUrl: string | undefined

  for (const file of ['tsconfig.json', 'jsconfig.json']) {
    const options = parse(await $.fs.read(`${root}/${file}`).catch(() => undefined))?.compilerOptions

    if (options !== undefined && options !== null) {
      aliases.push(...Object.keys(options.paths ?? {}).map((key: string) => key.replace(/\*$/, '')))
      baseUrl ??= typeof options.baseUrl === 'string' ? options.baseUrl : undefined
    }
  }

  return { declared, aliases, baseUrl }
}

const IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(['"])([^'"\n]+)\1/g

const packageOf = (spec: string): string | undefined => {
  if (/^[./#~$]|^@\/|:/.test(spec)) {
    return undefined
  }

  const [first = '', second = ''] = spec.split('/')
  const name = first.startsWith('@') ? `${first}/${second}` : first

  return BUILTINS.has(name) ? undefined : name
}

const packagesIn = (text: string): Set<string> => {
  const found = new Set<string>()

  for (const match of text.matchAll(IMPORT)) {
    const name = packageOf(match[2] ?? '')

    if (name !== undefined) {
      found.add(name)
    }
  }

  return found
}

const isInside = (root: string, path: string): boolean => {
  const slashed = path.replaceAll('\\', '/').toLowerCase()

  return slashed.startsWith(`${root.replaceAll('\\', '/').toLowerCase()}/`) && !slashed.includes('/node_modules/')
}

// The first package the edit starts importing that the project does not have; undefined when all are there.
const missing = async ($: EngineInterface, path: string, before: string, after: string): Promise<string | undefined> => {
  if (cache.project === undefined) {
    cache.project = await detect($)
  }

  const project = cache.project
  const root = await $.session.root()

  if (project === null || !SOURCE.test(path) || !isInside(root, path)) {
    return undefined
  }

  const known = packagesIn(before)

  for (const name of packagesIn(after)) {
    const isAlias = project.aliases.some(alias => alias !== '' && (name + '/').startsWith(alias.replace(/\/$/, '/')))

    if (known.has(name) || project.declared.has(name) || isAlias) {
      continue
    }

    if (
      (await $.fs.exists(`${root}/node_modules/${name}`)) ||
      (project.baseUrl !== undefined && (await $.fs.exists(`${root}/${project.baseUrl}/${name}`)))
    ) {
      continue
    }

    return name
  }

  return undefined
}

const relative = async ($: EngineInterface, path: string): Promise<string> => {
  const root = (await $.session.root()).replaceAll('\\', '/')
  const slashed = path.replaceAll('\\', '/')

  return slashed.toLowerCase().startsWith(`${root.toLowerCase()}/`) ? slashed.slice(root.length + 1) : slashed
}

export const register: Register = on => {
  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const before = (await $.fs.read(e.file_path).catch(() => undefined)) ?? ''
    const name = await missing($, e.file_path, before, e.content)

    return name === undefined ? next(e) : { deny: (await strings($)).denied(name, await relative($, e.file_path)) }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const name = await missing($, e.file_path, e.old_string, e.new_string)

    return name === undefined ? next(e) : { deny: (await strings($)).denied(name, await relative($, e.file_path)) }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
