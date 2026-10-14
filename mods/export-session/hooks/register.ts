import type { EngineInterface, Register, SessionMessage } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const FOLDER = '.claude-exports'

const two = (n: number): string => String(n).padStart(2, '0')

// session-2026-10-13-1542.md from the local time.
const stamp = (ms: number): string => {
  const d = new Date(ms)

  return `session-${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}`
}

// A file name inside the folder: no directories, no odd characters, always .md.
const fileName = (arg: string, ms: number): string => {
  const base = (arg.trim().split(/[\\/]/).pop() ?? '').replace(/[^\w.-]+/g, '-').replace(/^\.+/, '')

  if (base === '') {
    return `${stamp(ms)}.md`
  }

  return /\.md$/i.test(base) ? base : `${base}.md`
}

const markdown = (messages: readonly SessionMessage[], root: string, ms: number, s: (typeof STRINGS)['en']): string => {
  const parts = messages.flatMap(message => {
    const text = message.text.trim()
    const tools = message.toolUses.map(use => use.tool)

    if (text === '' && tools.length === 0) {
      return []
    }

    const body = [
      `## ${message.role === 'user' ? s.user : s.assistant}`,
      ...(text === '' ? [] : [text]),
      ...(tools.length === 0 ? [] : [`*${s.tools([...new Set(tools)].join(', '))}*`]),
    ]

    return [body.join('\n\n')]
  })
  const head = [`# ${s.title}`, `- ${s.project}: ${root}`, `- ${s.date}: ${new Date(ms).toISOString()}`, `- ${s.messages}: ${parts.length}`]

  return `${head.join('\n')}\n\n---\n\n${parts.join('\n\n')}\n`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'save-session', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'save-session' }, async ($, e) => {
    const s = await strings($)
    const messages = await $.session.messages()
    const root = await $.session.root()
    const ms = await $.clock.now()
    const body = markdown(messages, root, ms, s)
    const count = (body.match(/^## /gm) ?? []).length

    if (count === 0) {
      return { text: s.nothing }
    }

    const path = `${FOLDER}/${fileName(e.args, ms)}`

    try {
      await $.fs.write(`${root}/${path}`, body)
    } catch (error) {
      return { text: s.failed(error instanceof Error ? error.message : String(error)) }
    }

    return { text: s.saved(count, path) }
  })
}
