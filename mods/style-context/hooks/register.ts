import type { EngineInterface, Register } from 'claude-code'

const PRETTIER = ['.prettierrc', '.prettierrc.json', '.prettierrc.yaml', '.prettierrc.yml']
const ESLINT = ['.eslintrc.json', '.eslintrc']
const MAX_RULES = 6

// Read once per module load; an edit of a style file clears it.
// The section is read by the model only: English, not translated.
const cache: { text: string | undefined } = { text: undefined }

const WATCHED = /(^|[^\w.-])(\.prettierrc[\w.]*|\.editorconfig|\.eslintrc[\w.]*|package\.json)$/

type Options = Record<string, unknown>

// A .prettierrc is JSON or a flat YAML file of `key: value` lines.
const parseOptions = (text: string): Options => {
  try {
    const parsed: unknown = JSON.parse(text)

    return parsed !== null && typeof parsed === 'object' ? (parsed as Options) : {}
  } catch {
    const options: Options = {}

    for (const line of text.split('\n')) {
      const match = /^([A-Za-z]+):\s*(\S.*?)\s*$/.exec(line)

      if (match !== null) {
        const value = match[2] ?? ''
        options[match[1] ?? ''] = value === 'true' ? true : value === 'false' ? false : value.replace(/^['"]|['"]$/g, '')
      }
    }

    return options
  }
}

const firstRead = async ($: EngineInterface, root: string, names: readonly string[]): Promise<string | undefined> => {
  for (const name of names) {
    const text = await $.fs.read(`${root}/${name}`).catch(() => undefined)

    if (typeof text === 'string') {
      return text
    }
  }

  return undefined
}

const prettierLines = (o: Options): string[] => {
  const lines: string[] = []

  if (typeof o.semi === 'boolean') {
    lines.push(o.semi ? 'semicolons' : 'no semicolons')
  }

  if (typeof o.singleQuote === 'boolean') {
    lines.push(o.singleQuote ? 'single quotes' : 'double quotes')
  }

  if (o.useTabs === true) {
    lines.push('tab indent')
  } else if (o.tabWidth !== undefined) {
    lines.push(`indent ${String(o.tabWidth)} spaces`)
  }

  if (o.printWidth !== undefined) {
    lines.push(`line width ${String(o.printWidth)}`)
  }

  if (typeof o.trailingComma === 'string') {
    lines.push(`trailing commas: ${o.trailingComma}`)
  }

  return lines
}

const editorconfigLines = (text: string): string[] => {
  const get = (key: string): string | undefined => new RegExp(`^\\s*${key}\\s*=\\s*(\\S+)`, 'mi').exec(text)?.[1]?.toLowerCase()
  const style = get('indent_style')
  const size = get('indent_size')
  const eol = get('end_of_line')
  const width = get('max_line_length')

  return [
    style === undefined ? undefined : `${style}${size === undefined ? '' : ` ${size}`} indent`,
    eol === undefined ? undefined : `${eol} line endings`,
    width === undefined || width === 'off' ? undefined : `max line length ${width}`,
  ].filter((line): line is string => line !== undefined)
}

type Manifest = { prettier?: unknown; eslintConfig?: { rules?: Record<string, unknown> } }

const describe = async ($: EngineInterface): Promise<string> => {
  const root = await $.session.root()
  const manifestText = await $.fs.read(`${root}/package.json`).catch(() => undefined)
  let manifest: Manifest = {}

  try {
    manifest = typeof manifestText === 'string' ? (JSON.parse(manifestText) as Manifest) : {}
  } catch {
    // Invalid package.json: the config files still count.
  }

  const prettierText = await firstRead($, root, PRETTIER)
  const prettier = prettierText === undefined
    ? typeof manifest.prettier === 'object' && manifest.prettier !== null ? (manifest.prettier as Options) : undefined
    : parseOptions(prettierText)
  const editorText = await $.fs.read(`${root}/.editorconfig`).catch(() => undefined)
  const editor = typeof editorText === 'string' ? editorconfigLines(editorText) : []
  const eslintText = await firstRead($, root, ESLINT)
  let rules: Record<string, unknown> = manifest.eslintConfig?.rules ?? {}

  try {
    rules = eslintText === undefined ? rules : ((JSON.parse(eslintText) as { rules?: Record<string, unknown> }).rules ?? {})
  } catch {
    // An .eslintrc in YAML: no rules are listed.
  }

  const severity = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value)
  const strict = Object.entries(rules)
    .filter(([, value]) => severity(value) === 'error' || severity(value) === 2)
    .map(([name]) => name)
    .slice(0, MAX_RULES)

  const lines = [
    prettier === undefined ? undefined : `- prettier: ${prettierLines(prettier).join(', ') || 'default options'}`,
    editor.length > 0 ? `- editorconfig: ${editor.join(', ')}` : undefined,
    strict.length > 0 ? `- eslint errors on: ${strict.join(', ')}` : undefined,
  ].filter((line): line is string => line !== undefined)

  return lines.length === 0 ? '' : `# Code style enforced by the formatter and linter\n${lines.join('\n')}\n- Match it; the formatter would rewrite anything else.`
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
      : { sections: [...composed.sections, { id: 'style-context:style', text: cache.text, scope: 'session' }] }
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
