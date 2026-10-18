import type { EngineInterface, Register } from 'claude-code'

const IGNORED = new Set(['node_modules', 'dist', 'build', 'out', 'target', 'coverage', 'vendor', 'venv', '__pycache__', 'bin', 'obj'])
const MAX_DIRS = 14
const MAX_CHILDREN = 8

// Read once per module load; a Write near the root clears it.
// The section is read by the model only: English, not translated.
const cache: { text: string | undefined; root: string } = { text: undefined, root: '' }

const dirsOf = async ($: EngineInterface, path: string): Promise<string[]> => {
  const entries = await $.fs.list(path).catch(() => [])

  return entries
    .filter(entry => entry.kind === 'dir' && !entry.name.startsWith('.') && !IGNORED.has(entry.name))
    .map(entry => entry.name)
    .sort()
}

const describe = async ($: EngineInterface): Promise<string> => {
  const root = await $.session.root()
  cache.root = root
  const top = await dirsOf($, root)

  if (top.length === 0) {
    return ''
  }

  const lines: string[] = []

  for (const name of top.slice(0, MAX_DIRS)) {
    const children = await dirsOf($, `${root}/${name}`)
    const shown = children.slice(0, MAX_CHILDREN).join(', ')
    const more = children.length > MAX_CHILDREN ? `, +${children.length - MAX_CHILDREN}` : ''
    lines.push(children.length === 0 ? `- ${name}/` : `- ${name}/: ${shown}${more}`)
  }

  const rest = top.length > MAX_DIRS ? `\n- … ${top.length - MAX_DIRS} more folders` : ''

  return `# Folder layout (two levels, folders only)\n${lines.join('\n')}${rest}`
}

const forget = (path: string): void => {
  const normalized = path.replaceAll('\\', '/')
  const relative = cache.root !== '' && normalized.startsWith(`${cache.root}/`) ? normalized.slice(cache.root.length + 1) : normalized

  if (relative.split('/').length <= 3) {
    cache.text = undefined
  }
}

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    cache.text ??= await describe($)

    return cache.text === ''
      ? composed
      : { sections: [...composed.sections, { id: 'layout-context:layout', text: cache.text, scope: 'session' }] }
  })

  on('tool.call', { tool: 'Write' }, async (_$, e, next) => {
    const ran = await next(e)
    forget(e.file_path)

    return ran
  })
}
