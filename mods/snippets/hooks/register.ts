import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

type Snippet = { name: string; text: string }

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// One list for every project: snippets are reusable prompts, not project data.
const KEY = 'snippets'
const RESERVED = ['save', 'list', 'rm']

const load = async ($: EngineInterface): Promise<Snippet[]> => {
  const held = await $.store.get(KEY)

  return Array.isArray(held) ? (held as Snippet[]) : []
}

// The mouse selection, else ''.
const selected = async ($: EngineInterface): Promise<string> => {
  try {
    return (await $.ui.selection())?.text ?? ''
  } catch {
    return ''
  }
}

const isName = (name: string): boolean => /^[\w.-]{1,40}$/.test(name) && !RESERVED.includes(name)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'snip', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'snip' }, async ($, e) => {
    const s = await strings($)
    const [head = '', ...words] = e.args.trim().split(/\s+/)
    const name = words[0] ?? ''
    const snippets = await load($)

    if (head === '' || head === 'list') {
      const width = Math.max(...snippets.map(snippet => snippet.name.length))

      return {
        text:
          snippets.length === 0
            ? s.empty
            : snippets
                .map(({ name: label, text }) => `${label.padEnd(width)}  ${text.replace(/\s+/g, ' ').slice(0, 70)}`)
                .join('\n'),
      }
    }

    if (head === 'rm') {
      if (!snippets.some(snippet => snippet.name === name)) {
        return { text: name === '' ? s.usage : s.missing(name) }
      }

      await $.store.set(KEY, snippets.filter(snippet => snippet.name !== name))

      return { text: s.removed(name) }
    }

    if (head === 'save') {
      if (!isName(name)) {
        return { text: name === '' ? s.usage : s.badName }
      }

      // The text is everything after the name, as typed.
      const typed = e.args.replace(/^\s*save\s+\S+\s*/, '').trim()
      const text = typed === '' ? (await selected($)).trim() : typed

      if (text === '') {
        return { text: s.noText(name) }
      }

      const isNew = !snippets.some(snippet => snippet.name === name)
      await $.store.set(KEY, [...snippets.filter(snippet => snippet.name !== name), { name, text }])

      return { text: isNew ? s.saved(name) : s.updated(name) }
    }

    const found = snippets.find(snippet => snippet.name === head)

    if (found === undefined) {
      return { text: s.missing(head) }
    }

    const { isFilled } = await $.prompt.fill({ text: found.text })

    return { text: isFilled ? s.filled(head) : s.notFilled }
  })
}
