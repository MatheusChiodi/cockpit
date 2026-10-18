import type { EngineInterface, Register } from 'claude-code'

// Only the template files are read, never .env itself, and only the names leave this module.
const TEMPLATES = ['.env.example', '.env.sample', '.env.template', '.env.dist', 'example.env']
const MAX_NAMES = 40

// Read once per module load; an edit of a template clears it.
// The section is read by the model only: English, not translated.
const cache: { text: string | undefined } = { text: undefined }

const WATCHED = /(^|[^\w.-])(\.env\.(example|sample|template|dist)|example\.env)$/

const describe = async ($: EngineInterface): Promise<string> => {
  const root = await $.session.root()
  const names: string[] = []

  for (const template of TEMPLATES) {
    const text = await $.fs.read(`${root}/${template}`).catch(() => undefined)

    if (typeof text === 'string') {
      for (const line of text.split('\n')) {
        const name = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line)?.[1]

        if (name !== undefined && !names.includes(name)) {
          names.push(name)
        }
      }

      break
    }
  }

  if (names.length === 0) {
    return ''
  }

  const more = names.length > MAX_NAMES ? `, +${names.length - MAX_NAMES} more` : ''

  return `# Environment variables the app expects (names only)\n${names.slice(0, MAX_NAMES).join(', ')}${more}\nRead them through the app's config; never print or hard-code their values.`
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
      : { sections: [...composed.sections, { id: 'env-names-context:env', text: cache.text, scope: 'session' }] }
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
