import type { EngineInterface, Register } from 'claude-code'

const NAMES = ['README.md', 'readme.md', 'README.markdown', 'README']
const MAX_CHARS = 320
const OPAQUE = /\b[A-Za-z0-9_-]{32,}\b/

// Read once per module load; an edit of the README clears it.
// The section is read by the model only: English, not translated.
const cache: { text: string | undefined } = { text: undefined }

const WATCHED = /(^|[^\w.-])README(\.md|\.markdown)?$/i

// The first prose paragraph: no headings, badges, images, HTML or rules before it.
const firstParagraph = (text: string): { title: string | undefined; body: string } => {
  const paragraph: string[] = []
  let title: string | undefined

  for (const raw of text.split('\n')) {
    const line = raw.trim()

    if (paragraph.length > 0 && line === '') {
      break
    }

    if (line.startsWith('#')) {
      title ??= line.replace(/^#+\s*/, '')
    } else if (line !== '' && !/^(\[!\[|!\[|<|---|===|```|\|)/.test(line)) {
      paragraph.push(line)
    }
  }

  return { title, body: paragraph.join(' ') }
}

const describe = async ($: EngineInterface): Promise<string> => {
  const root = await $.session.root()

  for (const name of NAMES) {
    const text = await $.fs.read(`${root}/${name}`).catch(() => undefined)

    if (typeof text === 'string') {
      const { title, body } = firstParagraph(text)

      if (body === '' || OPAQUE.test(body)) {
        return ''
      }

      const short = body.length > MAX_CHARS ? `${body.slice(0, MAX_CHARS)}…` : body

      return `# About this project (${name})\n${title === undefined ? '' : `${title}: `}${short}`
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
      : { sections: [...composed.sections, { id: 'readme-context:readme', text: cache.text, scope: 'session' }] }
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
