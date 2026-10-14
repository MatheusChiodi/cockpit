import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

const MAX_MATCHES = 20
const MAX_TEXT = 20000

// The mouse selection, else ''.
const selected = async ($: EngineInterface): Promise<string> => {
  try {
    return (await $.ui.selection())?.text ?? ''
  } catch {
    return ''
  }
}

// `/pattern/flags text`: the closing slash is the first one outside a character class and not escaped.
const split = (args: string): { pattern: string; flags: string; text: string } | undefined => {
  const source = args.trimStart()

  if (!source.startsWith('/')) {
    return undefined
  }

  let end = 1
  let isClass = false

  for (; end < source.length; end += 1) {
    const char = source.charAt(end)

    if (char === '\\') {
      end += 1
    } else if (char === '[') {
      isClass = true
    } else if (char === ']') {
      isClass = false
    } else if (char === '/' && !isClass) {
      break
    }
  }

  const rest = /^([a-z]*)(?:\s+([\s\S]*))?$/.exec(source.slice(end + 1))

  return end >= source.length || rest === null
    ? undefined
    : { pattern: source.slice(1, end), flags: rest[1] ?? '', text: rest[2] ?? '' }
}

const show = (value: string | undefined): string => {
  const text = JSON.stringify(value) ?? 'undefined'

  return text.length > 60 ? `${text.slice(0, 57)}..."` : text
}

const report = (pattern: string, flags: string, text: string, s: (typeof STRINGS)['en']): string => {
  let regex: RegExp

  try {
    regex = new RegExp(pattern, flags.includes('g') ? flags : `${flags}g`)
  } catch (error) {
    return s.invalid(error instanceof Error ? error.message : String(error))
  }

  const matches = [...text.slice(0, MAX_TEXT).matchAll(regex)]
  const head = `/${pattern}/${flags}  ${matches.length === 0 ? s.noMatch : s.matched(matches.length)}`
  const lines = matches.slice(0, MAX_MATCHES).flatMap((match, index) => [
    `#${index + 1}  @${match.index ?? 0}  ${show(match[0])}`,
    ...match.slice(1).map((group, at) => `      $${at + 1}  ${show(group)}`),
    ...Object.entries(match.groups ?? {}).map(([name, group]) => `      $<${name}>  ${show(group)}`),
  ])
  const more = matches.length > MAX_MATCHES ? [s.more(matches.length - MAX_MATCHES)] : []

  return [head, ...lines, ...more].join('\n')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 're', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 're' }, async ($, e) => {
    const s = await strings($)
    const parts = split(e.args)

    if (parts === undefined) {
      return { text: s.usage }
    }

    const text = parts.text === '' ? await selected($) : parts.text

    return { text: text === '' ? s.usage : report(parts.pattern, parts.flags, text, s) }
  })
}
