import type { EngineInterface, Register } from 'claude-code'

import { STRINGS } from './strings'

// cockpit: the language set in /cockpit (English when the hub is not installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

const strings = async ($: EngineInterface) => STRINGS[(await $.state.get(LANG)).value ?? 'en']

// The typed color, else the mouse selection, else ''.
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

type Rgb = [number, number, number]

const NUMBER = '(\\d+(?:\\.\\d+)?)'
const ALPHA = '\\s*(?:[,/]\\s*[\\d.]+%?\\s*)?\\)$'
const RGB = new RegExp(`^rgba?\\(\\s*${NUMBER}[\\s,]+${NUMBER}[\\s,]+${NUMBER}${ALPHA}`)
const HSL = new RegExp(`^hsla?\\(\\s*(-?\\d+(?:\\.\\d+)?)(?:deg)?[\\s,]+${NUMBER}%[\\s,]+${NUMBER}%${ALPHA}`)

const fromHsl = (hue: number, saturation: number, lightness: number): Rgb => {
  const h = (((hue % 360) + 360) % 360) / 60
  const s = Math.min(saturation, 100) / 100
  const l = Math.min(lightness, 100) / 100
  const chroma = (1 - Math.abs(2 * l - 1)) * s
  const x = chroma * (1 - Math.abs((h % 2) - 1))
  const base: Rgb = h < 1 ? [chroma, x, 0] : h < 2 ? [x, chroma, 0] : h < 3 ? [0, chroma, x] : h < 4 ? [0, x, chroma] : h < 5 ? [x, 0, chroma] : [chroma, 0, x]
  const m = l - chroma / 2

  return base.map(channel => Math.round((channel + m) * 255)) as Rgb
}

const toHsl = ([r, g, b]: Rgb): Rgb => {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  const l = (max + min) / 2
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
  const sector = max === rn ? ((gn - bn) / delta) % 6 : max === gn ? (bn - rn) / delta + 2 : (rn - gn) / delta + 4
  const h = delta === 0 ? 0 : (sector * 60 + 360) % 360

  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)]
}

// hex (#rgb, #rrggbb), rgb(r, g, b) and hsl(h, s%, l%); undefined for anything else.
const parse = (raw: string): Rgb | undefined => {
  const text = raw.toLowerCase()
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(text)

  if (hex !== null) {
    const digits = (hex[1] ?? '').length === 3 ? [...(hex[1] ?? '')].map(c => c + c).join('') : (hex[1] ?? '')

    return [0, 2, 4].map(at => parseInt(digits.slice(at, at + 2), 16)) as Rgb
  }

  const rgb = RGB.exec(text)

  if (rgb !== null) {
    const channels = [rgb[1], rgb[2], rgb[3]].map(Number) as Rgb

    return channels.every(channel => channel <= 255) ? channels.map(Math.round) as Rgb : undefined
  }

  const hsl = HSL.exec(text)

  return hsl === null ? undefined : fromHsl(Number(hsl[1]), Number(hsl[2]), Number(hsl[3]))
}

const luminance = (color: Rgb): number => {
  const [r, g, b] = color.map(channel => {
    const c = channel / 255

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as Rgb

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrast = (a: Rgb, b: Rgb): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]

  return (light + 0.05) / (dark + 0.05)
}

const grade = (ratio: number, s: (typeof STRINGS)['en']): string =>
  ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? s.large : s.fail

const table = (color: Rgb, s: (typeof STRINGS)['en']): { hex: string; text: string } => {
  const hex = `#${color.map(channel => channel.toString(16).padStart(2, '0')).join('')}`
  const [h, sat, l] = toHsl(color)
  const ratios = [contrast(color, [255, 255, 255]), contrast(color, [0, 0, 0])]
  const rows: [string, string][] = [
    ['hex', hex],
    ['rgb', `rgb(${color.join(', ')})`],
    ['hsl', `hsl(${h}, ${sat}%, ${l}%)`],
    [s.white, `${(ratios[0] ?? 0).toFixed(2)}:1  ${grade(ratios[0] ?? 0, s)}`],
    [s.black, `${(ratios[1] ?? 0).toFixed(2)}:1  ${grade(ratios[1] ?? 0, s)}`],
  ]
  const width = Math.max(...rows.map(([label]) => label.length))

  return { hex, text: rows.map(([label, value]) => `${label.padEnd(width)}  ${value}`).join('\n') }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const s = await strings($)
    await $.command.register({ name: 'color', description: s.command, argumentHint: s.hint })

    return next(e)
  })

  on('command.run', { command: 'color' }, async ($, e) => {
    const s = await strings($)
    const color = parse(await input($, e.args))

    if (color === undefined) {
      return { text: s.usage }
    }

    const { hex, text } = table(color, s)
    await $.ui.copy({ text: hex })

    return { text: `${text}\n${s.copied}` }
  })
}
