import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// The typed text, else the mouse selection, else ''.
const input = async ($: EngineInterface, args: string): Promise<string> => {
  if (args.trim() !== '') {
    return args.trim()
  }

  try {
    return ((await $.ui.selection())?.text ?? '').trim()
  } catch {
    return ''
  }
}

// Offset of the first syntax error, -1 when the text is valid JSON.
const errorOffset = (text: string): number => {
  let at = 0
  const space = () => {
    while (at < text.length && ' \t\n\r'.includes(text.charAt(at))) {
      at += 1
    }
  }
  const word = (value: string) => {
    if (!text.startsWith(value, at)) {
      throw at
    }

    at += value.length
  }
  const string = () => {
    at += 1

    while (at < text.length && text.charAt(at) !== '"') {
      const char = text.charAt(at)
      const next = text.charAt(at + 1)

      if (char < ' ') {
        throw at
      }

      if (char !== '\\') {
        at += 1
      } else if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(text.slice(at + 2, at + 6))) {
        at += 6
      } else if (next !== '' && '"\\/bfnrt'.includes(next)) {
        at += 2
      } else {
        throw at
      }
    }

    if (text.charAt(at) !== '"') {
      throw at
    }

    at += 1
  }
  const number = () => {
    const match = /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/y
    match.lastIndex = at

    if (match.exec(text) === null) {
      throw at
    }

    at = match.lastIndex
  }
  // Items of an array or members of an object, up to the closing mark.
  const list = (close: string, item: () => void) => {
    at += 1
    space()

    if (text.charAt(at) === close) {
      at += 1

      return
    }

    for (;;) {
      space()
      item()
      space()
      const mark = text.charAt(at)

      if (mark === close) {
        at += 1

        return
      }

      if (mark !== ',') {
        throw at
      }

      at += 1
    }
  }
  const member = () => {
    if (text.charAt(at) !== '"') {
      throw at
    }

    string()
    space()

    if (text.charAt(at) !== ':') {
      throw at
    }

    at += 1
    value()
  }
  const value = (): void => {
    space()
    const char = text.charAt(at)

    if (char === '{') {
      list('}', member)
    } else if (char === '[') {
      list(']', value)
    } else if (char === '"') {
      string()
    } else if (char === 't') {
      word('true')
    } else if (char === 'f') {
      word('false')
    } else if (char === 'n') {
      word('null')
    } else {
      number()
    }
  }

  try {
    value()
    space()

    return at < text.length ? at : -1
  } catch (thrown) {
    return typeof thrown === 'number' ? thrown : text.length
  }
}

// Pretty JSON, or the line and column of the problem with the text around it.
const check = (text: string, s: (typeof STRINGS)['en']): { pretty?: string; error?: string } => {
  const offset = errorOffset(text)

  if (offset === -1) {
    try {
      return { pretty: JSON.stringify(JSON.parse(text), null, 2) }
    } catch {
      // The scanner and the parser disagree: report the start.
    }
  }

  const at = Math.max(offset, 0)
  const before = text.slice(0, at)
  const line = before.split('\n').length
  const column = at - (before.lastIndexOf('\n') + 1) + 1
  const found = at >= text.length ? s.end : s.character(text.charAt(at))
  const source = text.split('\n')[line - 1] ?? ''
  const from = Math.max(0, column - 31)
  const caret = `${' '.repeat(column - 1 - from)}^`

  return { error: `${s.invalid(line, column, found)}\n${source.slice(from, from + 70)}\n${caret}` }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'json', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'json' }, async ($, e) => {
    const s = await strings($)
    const text = await input($, e.args)

    if (text === '') {
      return { text: s.usage }
    }

    const verdict = check(text, s)

    if (verdict.pretty === undefined) {
      return { text: verdict.error }
    }

    await $.ui.copy({ text: verdict.pretty })

    return { text: `${s.valid(verdict.pretty.split('\n').length)} ${s.copied}\n${verdict.pretty}` }
  })
}
