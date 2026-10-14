import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const gh = ($: EngineInterface, args: readonly string[]) =>
  $.process.run(['gh', ...args], { timeoutMs: 30000 }).catch(() => undefined)

type Comment = {
  id: number
  in_reply_to_id?: number | null
  user?: { login?: string }
  path?: string
  line?: number | null
  original_line?: number | null
  body?: string
}

const parse = <T>(text: string | undefined): T | undefined => {
  try {
    return text === undefined ? undefined : (JSON.parse(text) as T)
  } catch {
    return undefined
  }
}

const MAX_LISTED = 10
const MAX_BODY = 80

const reading = async ($: EngineInterface): Promise<{ text: string }> => {
  const s = await strings($)
  const view = await gh($, ['pr', 'view', '--json', 'number,author'])
  const pr = view?.exitCode === 0 ? parse<{ number?: number; author?: { login?: string } }>(view.stdout) : undefined

  if (pr?.number === undefined) {
    return { text: s.noGh }
  }

  const ran = await gh($, ['api', `repos/{owner}/{repo}/pulls/${pr.number}/comments`, '--paginate'])
  const comments = ran?.exitCode === 0 ? parse<Comment[]>(ran.stdout) : undefined

  if (comments === undefined) {
    return { text: s.noGh }
  }

  const me = pr.author?.login
  // A thread waits for you when its root comes from someone else and you never replied in it.
  const answered = new Set(comments.filter(c => c.user?.login === me && c.in_reply_to_id != null).map(c => c.in_reply_to_id))
  const waiting = comments.filter(c => c.in_reply_to_id == null && c.user?.login !== me && !answered.has(c.id))

  if (waiting.length === 0) {
    return { text: s.none(pr.number) }
  }

  const rows = waiting.slice(0, MAX_LISTED).map(c => {
    const body = (c.body ?? '').replace(/\s+/g, ' ').trim()

    return `  ${c.user?.login ?? '?'}  ${c.path ?? ''}:${c.line ?? c.original_line ?? ''}  ${body.length > MAX_BODY ? `${body.slice(0, MAX_BODY)}…` : body}`
  })
  const rest = waiting.length - rows.length

  return { text: [s.head(pr.number, waiting.length), ...rows, ...(rest > 0 ? [s.more(rest)] : [])].join('\n') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'prcomments', description: s.command })

    return next(e)
  })

  on('command.run', { command: 'prcomments' }, $ => reading($))
}
