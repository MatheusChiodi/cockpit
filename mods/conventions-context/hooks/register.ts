import type { EngineInterface, Register } from 'claude-code'

const CANDIDATES = [
  'CONTRIBUTING.md',
  '.github/CONTRIBUTING.md',
  'docs/CONTRIBUTING.md',
  'CONVENTIONS.md',
  'docs/conventions.md',
  'STYLEGUIDE.md',
  'docs/style-guide.md',
]
const MAX_HEADINGS = 6

// Read once per module load; an edit of the file clears it.
// The section is read by the model only: English, not translated.
const cache: { text: string | undefined } = { text: undefined }

const WATCHED = /(^|[^\w.-])(CONTRIBUTING|CONVENTIONS|STYLEGUIDE|conventions|style-guide)\.md$/

const describe = async ($: EngineInterface): Promise<string> => {
  const root = await $.session.root()

  for (const path of CANDIDATES) {
    const text = await $.fs.read(`${root}/${path}`).catch(() => undefined)

    if (typeof text === 'string') {
      const lines = text.split('\n').length - (text.endsWith('\n') ? 1 : 0)
      const headings = text
        .split('\n')
        .filter(line => /^##\s+\S/.test(line))
        .map(line => line.replace(/^##\s+/, '').trim())
        .slice(0, MAX_HEADINGS)

      return [
        '# Conventions file',
        `${path} (${lines} lines)${headings.length > 0 ? `: ${headings.join(', ')}` : ''}`,
        'Read it before writing code or opening a pull request.',
      ].join('\n')
    }
  }

  return ''
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
      : { sections: [...composed.sections, { id: 'conventions-context:file', text: cache.text, scope: 'session' }] }
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
