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

const upper = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1)

const STYLES = {
  camel: (words: string[]) => words.map((word, index) => (index === 0 ? word : upper(word))).join(''),
  snake: (words: string[]) => words.join('_'),
  kebab: (words: string[]) => words.join('-'),
  pascal: (words: string[]) => words.map(upper).join(''),
  constant: (words: string[]) => words.join('_').toUpperCase(),
  slug: (words: string[]) => words.join('-'),
}

type Style = keyof typeof STYLES

const isStyle = (word: string): word is Style => word in STYLES

// Lowercase words: breaks at separators, at camelCase humps, at XMLHttp acronym ends and around digits.
const words = (text: string, accents: boolean): string[] => {
  const plain = accents ? text.normalize('NFD').replace(/[̀-ͯ]/g, '') : text

  return plain
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/(\d)([A-Za-z])|([A-Za-z])(\d)/g, '$1$3 $2$4')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(word => word !== '')
    .map(word => word.toLowerCase())
}

const convert = (style: Style, text: string): string => STYLES[style](words(text, style === 'slug')).replace(/[^\p{L}\p{N}_-]/gu, '')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'case', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'case' }, async ($, e) => {
    const s = await strings($)
    const typed = e.args.trim()
    const first = typed.split(/\s+/)[0]?.toLowerCase() ?? ''
    const style = isStyle(first) ? first : undefined
    const text = await input($, style === undefined ? typed : typed.slice(first.length))

    if (text === '') {
      return { text: s.usage }
    }

    if (words(text, true).length === 0) {
      return { text: s.empty }
    }

    if (style === undefined) {
      const names = Object.keys(STYLES) as Style[]

      return { text: names.map(name => `${name.padEnd(9)}${convert(name, text)}`).join('\n') }
    }

    const out = convert(style, text)
    await $.ui.copy({ text: out })

    return { text: `${out}\n${s.copied}` }
  })
}
