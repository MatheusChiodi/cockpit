import type { EngineInterface, Register } from 'claude-code'

const VERSION = /^v?\d[\w.*-]*$/

// Read once per module load; an edit of a pin file clears it.
// The section is read by the model only: English, not translated.
const cache: { text: string | undefined } = { text: undefined }

const WATCHED = /(^|[^\w.-])(\.nvmrc|\.node-version|\.python-version|\.tool-versions|package\.json|pom\.xml)$/

const describe = async ($: EngineInterface): Promise<string> => {
  const root = await $.session.root()
  const read = (name: string) => $.fs.read(`${root}/${name}`).catch(() => undefined)
  const lines: string[] = []

  for (const [file, label] of [['.nvmrc', 'node'], ['.node-version', 'node'], ['.python-version', 'python']] as const) {
    const version = ((await read(file)) as string | undefined)?.trim().split('\n')[0]?.trim()

    if (version !== undefined && VERSION.test(version) && !lines.some(line => line.startsWith(`- ${label} `))) {
      lines.push(`- ${label} ${version} (${file})`)
    }
  }

  const tools = await read('.tool-versions')

  if (typeof tools === 'string') {
    for (const line of tools.split('\n')) {
      const [tool, version] = line.trim().split(/\s+/)

      if (tool !== undefined && !tool.startsWith('#') && version !== undefined && VERSION.test(version)) {
        lines.push(`- ${tool} ${version} (.tool-versions)`)
      }
    }
  }

  const manifest = await read('package.json')

  if (typeof manifest === 'string') {
    try {
      const parsed = JSON.parse(manifest) as { engines?: Record<string, unknown>; packageManager?: unknown }

      for (const [engine, range] of Object.entries(parsed.engines ?? {})) {
        if (typeof range === 'string') {
          lines.push(`- engines.${engine}: ${range}`)
        }
      }

      if (typeof parsed.packageManager === 'string') {
        lines.push(`- packageManager: ${parsed.packageManager}`)
      }
    } catch {
      // Invalid package.json: the pin files still count.
    }
  }

  const pom = await read('pom.xml')
  const java = typeof pom === 'string' ? /<(?:java\.version|maven\.compiler\.(?:source|release))>\s*([\d.]+)\s*</.exec(pom)?.[1] : undefined

  if (java !== undefined) {
    lines.push(`- java ${java} (pom.xml)`)
  }

  return lines.length === 0 ? '' : `# Pinned runtimes\n${lines.join('\n')}`
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
      : { sections: [...composed.sections, { id: 'runtime-pin-context:runtimes', text: cache.text, scope: 'session' }] }
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
