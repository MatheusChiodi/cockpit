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

type Token = { text: string; at: number; value?: number }
type Failure = { kind: 'character' | 'unexpected' | 'end' | 'paren' | 'zero' | 'invalid'; found: string; at: number }

const fail = (kind: Failure['kind'], found = '', at = 0): never => {
  throw { kind, found, at } satisfies Failure
}

// Numbers, operators and parentheses; `at` is the 1-based position in the text.
const tokenize = (text: string): Token[] => {
  const tokens: Token[] = []
  const number = /\d+\.?\d*|\.\d+/y
  let at = 0

  while (at < text.length) {
    const char = text.charAt(at)
    number.lastIndex = at
    const hit = number.exec(text)

    if (/\s/.test(char)) {
      at += 1
    } else if (hit !== null) {
      tokens.push({ text: hit[0], at: at + 1, value: Number(hit[0]) })
      at = number.lastIndex
    } else if ('+-*/%^()'.includes(char)) {
      tokens.push({ text: char, at: at + 1 })
      at += 1
    } else {
      fail('character', char, at + 1)
    }
  }

  return tokens
}

// Recursive descent: expr > term > unary > power > primary. `^` binds tighter than a unary minus and is right-associative.
const evaluate = (text: string): number => {
  const tokens = tokenize(text)
  let at = 0
  const isOp = (value: string) => tokens[at]?.value === undefined && tokens[at]?.text === value
  const take = (value: string) => {
    if (!isOp(value)) {
      return false
    }

    at += 1

    return true
  }
  const primary = (): number => {
    const token = tokens[at]

    if (token === undefined) {
      return fail('end')
    }

    if (token.value !== undefined) {
      at += 1

      return token.value
    }

    if (token.text !== '(') {
      return fail('unexpected', token.text, token.at)
    }

    at += 1
    const inner = expr()

    if (!take(')')) {
      const next = tokens[at]

      return next === undefined ? fail('paren', '(', token.at) : fail('unexpected', next.text, next.at)
    }

    return inner
  }
  const power = (): number => {
    const base = primary()

    return take('^') ? base ** unary() : base
  }
  const unary = (): number => {
    if (take('-')) {
      return -unary()
    }

    return take('+') ? unary() : power()
  }
  const term = (): number => {
    let value = unary()

    for (;;) {
      const op = ['*', '/', '%'].find(take)

      if (op === undefined) {
        return value
      }

      const right = unary()

      if (op !== '*' && right === 0) {
        fail('zero')
      }

      value = op === '*' ? value * right : op === '/' ? value / right : value % right
    }
  }
  const expr = (): number => {
    let value = term()

    for (;;) {
      if (take('+')) {
        value += term()
      } else if (take('-')) {
        value -= term()
      } else {
        return value
      }
    }
  }
  const value = expr()
  const left = tokens[at]

  if (left !== undefined) {
    fail('unexpected', left.text, left.at)
  }

  return Number.isFinite(value) ? value : fail('invalid')
}

// The result as text, or the message for what is wrong with the expression.
const calculate = (text: string, s: (typeof STRINGS)['en']): { result?: string; error?: string } => {
  try {
    return { result: String(Number(evaluate(text).toPrecision(12))) }
  } catch (thrown) {
    const failure = thrown as Failure

    switch (failure.kind) {
      case 'character':
        return { error: s.character(failure.found, failure.at) }
      case 'unexpected':
        return { error: s.unexpected(failure.found, failure.at) }
      case 'paren':
        return { error: s.paren(failure.at) }
      case 'zero':
        return { error: s.zero }
      case 'invalid':
        return { error: s.invalid }
      default:
        return { error: s.end }
    }
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'calc', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'calc' }, async ($, e) => {
    const s = await strings($)
    const text = await input($, e.args)

    if (text === '') {
      return { text: s.usage }
    }

    const { result, error } = calculate(text, s)

    if (result === undefined) {
      return { text: error }
    }

    await $.ui.copy({ text: result })

    return { text: `${text} = ${result}\n${s.copied}` }
  })
}
