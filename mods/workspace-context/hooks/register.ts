import type { EngineInterface, Register } from 'claude-code'

const MAX_PACKAGES = 15

// Read once per module load; an edit of a workspace file clears it.
// The section is read by the model only: English, not translated.
const cache: { text: string | undefined } = { text: undefined }

const WATCHED = /(^|[^\w.-])(package\.json|pnpm-workspace\.yaml|pom\.xml)$/

// The patterns of `workspaces` (array or { packages }) and of pnpm-workspace.yaml.
const patternsOf = async ($: EngineInterface, root: string): Promise<string[]> => {
  const patterns: string[] = []
  const manifest = await $.fs.read(`${root}/package.json`).catch(() => undefined)

  if (typeof manifest === 'string') {
    try {
      const { workspaces } = JSON.parse(manifest) as { workspaces?: unknown }
      const list = Array.isArray(workspaces) ? workspaces : (workspaces as { packages?: unknown } | undefined)?.packages
      patterns.push(...(Array.isArray(list) ? list.filter((item): item is string => typeof item === 'string') : []))
    } catch {
      // Invalid package.json: the other files still count.
    }
  }

  const pnpm = await $.fs.read(`${root}/pnpm-workspace.yaml`).catch(() => undefined)

  if (typeof pnpm === 'string') {
    for (const match of pnpm.matchAll(/^\s*-\s*['"]?([^'"\s#]+)['"]?/gm)) {
      patterns.push(match[1] ?? '')
    }
  }

  return patterns.filter(pattern => pattern !== '' && !pattern.startsWith('!'))
}

// `apps/*` lists the folders of apps; a plain `tools/cli` is itself a package.
const foldersOf = async ($: EngineInterface, root: string, pattern: string): Promise<string[]> => {
  const clean = pattern.replace(/\/+$/, '').replace(/^\.\//, '')

  if (!clean.endsWith('/*') && !clean.endsWith('/**')) {
    return clean.includes('*') ? [] : [clean]
  }

  const parent = clean.replace(/\/\*+$/, '')
  const entries = await $.fs.list(`${root}/${parent}`).catch(() => [])

  return entries.filter(entry => entry.kind === 'dir' && !entry.name.startsWith('.')).map(entry => `${parent}/${entry.name}`)
}

const describe = async ($: EngineInterface): Promise<string> => {
  const root = await $.session.root()
  const folders: string[] = []

  for (const pattern of await patternsOf($, root)) {
    for (const folder of await foldersOf($, root, pattern)) {
      if (!folders.includes(folder)) {
        folders.push(folder)
      }
    }
  }

  const pom = await $.fs.read(`${root}/pom.xml`).catch(() => undefined)

  if (typeof pom === 'string') {
    for (const match of pom.matchAll(/<module>\s*([^<\s]+)\s*<\/module>/g)) {
      folders.push(match[1] ?? '')
    }
  }

  const lines: string[] = []

  for (const folder of folders.filter(folder => folder !== '').slice(0, MAX_PACKAGES)) {
    const text = await $.fs.read(`${root}/${folder}/package.json`).catch(() => undefined)
    let name: string | undefined

    try {
      name = typeof text === 'string' ? (JSON.parse(text) as { name?: string }).name : undefined
    } catch {
      name = undefined
    }

    lines.push(name === undefined ? `- ${folder}` : `- ${name}: ${folder}`)
  }

  if (lines.length === 0) {
    return ''
  }

  const rest = folders.length > MAX_PACKAGES ? `\n- … ${folders.length - MAX_PACKAGES} more` : ''

  return `# Workspace packages (monorepo)\n${lines.join('\n')}${rest}`
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
      : { sections: [...composed.sections, { id: 'workspace-context:packages', text: cache.text, scope: 'session' }] }
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
