import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const norm = (path: string): string => path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()

const resolved = async ($: EngineInterface, path: string | undefined): Promise<string | undefined> => {
  if (path === undefined || path === '') {
    return undefined
  }

  const stat = await $.fs.stat(path, { resolve: true }).catch(() => undefined)

  return stat?.realPath === undefined ? undefined : norm(stat.realPath)
}

// Where the write will land: the file itself if it exists, else its folder + the name.
const placed = async ($: EngineInterface, path: string): Promise<string | undefined> => {
  const cut = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  const name = path.slice(cut + 1)
  const isPlaceable =
    !/^[A-Za-z]:(?![\\/])/.test(path) &&
    !/^[\\/][\\/]/.test(path) &&
    !/^[A-Za-z]:/.test(name) &&
    name !== '' &&
    name !== '.' &&
    name !== '..'

  if (!isPlaceable) {
    return undefined
  }

  const own = await resolved($, path)

  if (own !== undefined) {
    return own
  }

  // Walks up to the first folder that exists: Write creates the intermediate ones.
  let folder = cut < 0 ? '.' : path.slice(0, cut + 1)
  let tail = name

  for (let depth = 0; depth < 32; depth += 1) {
    const dir = await resolved($, folder)

    if (dir !== undefined) {
      return `${dir}/${tail.toLowerCase()}`
    }

    const trimmed = folder.replace(/[\\/]+$/, '')
    const up = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))

    if (up < 0 || trimmed.slice(up + 1) === '..') {
      return undefined
    }

    tail = `${trimmed.slice(up + 1)}/${tail}`
    folder = trimmed.slice(0, up + 1)
  }

  return undefined
}

const allowedRoots = async ($: EngineInterface): Promise<string[]> => {
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME'))
  const roots = await Promise.all([
    resolved($, await $.session.root()),
    resolved($, await $.session.cwd()),
    resolved($, await $.env.get('TEMP')),
    resolved($, await $.env.get('TMPDIR')),
    resolved($, '/tmp'),
    resolved($, home === undefined ? undefined : `${home}/.claude`),
  ])

  return roots.filter((root): root is string => root !== undefined)
}

// Why the write is refused, in the session's language; undefined when it lands inside the jail.
const verdict = async ($: EngineInterface, path: string): Promise<string | undefined> => {
  const real = await placed($, path)
  const roots = await allowedRoots($)
  const isInside = real !== undefined && roots.some(root => real === root || real.startsWith(`${root}/`))

  return isInside ? undefined : (await strings($)).outside(path)
}

export const register: Register = on => {
  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const deny = await verdict($, e.file_path)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const deny = await verdict($, e.file_path)

    return deny === undefined ? next(e) : { deny }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: STRINGS.en.failed }))
}
