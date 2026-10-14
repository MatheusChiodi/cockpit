// Generates docs/previews/<mod>.svg (a terminal mockup per mod), docs/cockpit.svg and one README per language.
// The static part of each README lives in docs/readme/<lang>.md; this script fills in the counts and the catalog.
// Usage: node scripts/build-docs.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { loadCatalog, root, text } from './lib.mjs'

const catalog = loadCatalog()

const WIDTH = 760
const CHAR = 7.83
const LINE = 21
const TOP = 66
const LEFT = 24
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Cascadia Mono',monospace"

// The kit's palette: one hue per subject; green, amber and red only for state.
const HUE = { git: '#b39df2', session: '#e58c62', project: '#74a8f5', daily: '#5fc9b8' }

const COLORS = {
  ...HUE,
  text: '#d5dbe6',
  dim: '#677185',
  rule: '#2a3242',
  user: '#eef2f8',
  tool: '#8fd18b',
  ok: '#8fd18b',
  err: '#f07b7b',
  warn: '#e8bd6a',
  accent: '#e58c62',
  bold: '#ffffff',
  btn: '#74a8f5',
  cursor: '#d5dbe6',
}

const CATEGORY_HUE = {
  security: COLORS.err,
  interface: HUE.session,
  prompt: HUE.git,
  commands: HUE.project,
  focus: HUE.daily,
}

const hueOf = mod => HUE[mod.group] ?? CATEGORY_HUE[mod.category] ?? HUE.session

const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// "[[style|text]]" marks a stretch; the rest of the line takes the default color.
const segments = line => {
  const parts = []
  let at = 0

  for (const match of line.matchAll(/\[\[(\w+)\|(.*?)\]\](?!\])/g)) {
    if (match.index > at) {
      parts.push({ style: 'text', text: line.slice(at, match.index) })
    }

    parts.push({ style: match[1], text: match[2] })
    at = match.index + match[0].length
  }

  if (at < line.length) {
    parts.push({ style: 'text', text: line.slice(at) })
  }

  return parts
}

// An emoji takes two cells in a terminal.
const cells = value => [...value].reduce((sum, char) => sum + (char.codePointAt(0) > 0x1f000 ? 2 : 1), 0)

const BOXED = {
  toast: { fill: '#1a2130', stroke: COLORS.accent, color: '#f6e7df' },
  notify: { fill: '#222a38', stroke: '#3b4660', color: COLORS.user },
  sel: { fill: '#35508a', stroke: 'none', color: '#ffffff' },
}

// Previews are written in the plain shapes; the kit's current look is applied here, in one place:
// the placard takes its rail's hue, and a gauge ends in the slider knob.
const dressed = line =>
  line
    .replace(/\[\[(git|session|project|daily)\|▍ \]\]\[\[dim\|([^\]]*)\]\]/, '[[$1|▍ $2]]')
    .replace(/━\]\]\[\[rule\|(─*)\]\]/g, '●]][[rule|$1]]')

const renderLine = (raw, row) => {
  const line = dressed(raw)
  const y = TOP + row * LINE
  const backgrounds = []
  const spans = []
  let column = 0

  for (const { style, text: content } of segments(line)) {
    const width = cells(content)
    const box = BOXED[style]

    if (box !== undefined) {
      backgrounds.push(
        `<rect x="${(LEFT + column * CHAR - 2).toFixed(1)}" y="${y - 15}" width="${(width * CHAR + 4).toFixed(1)}" height="${LINE}" rx="4" fill="${box.fill}" stroke="${box.stroke}"/>`,
      )
    }

    const weight = style === 'bold' || style === 'toast' ? ' font-weight="700"' : ''
    spans.push(
      // textLength pins the width in cells, so alignment does not depend on the reader's font.
      `<tspan x="${(LEFT + column * CHAR).toFixed(1)}" textLength="${(width * CHAR).toFixed(1)}" lengthAdjust="spacingAndGlyphs" fill="${box?.color ?? COLORS[style] ?? COLORS.text}"${weight}>${escape(content)}</tspan>`,
    )
    column += width
  }

  return `${backgrounds.join('')}<text y="${y}" xml:space="preserve">${spans.join('')}</text>`
}

// The collection's own frame: a thread in the subject's hue, the rotor, the mod's name, its category at the right.
const frame = ({ name, tag, hue, lines }) => {
  const height = TOP + lines.length * LINE + 10

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="${escape(name)} in the terminal">
<defs><clipPath id="card"><rect width="${WIDTH}" height="${height}" rx="12"/></clipPath></defs>
<g clip-path="url(#card)">
<rect width="${WIDTH}" height="${height}" fill="#0f131a"/>
<rect width="${WIDTH}" height="38" fill="#141a24"/>
<rect y="38" width="${WIDTH}" height="1" fill="#222a38"/>
<rect width="${WIDTH}" height="3" fill="${hue}"/>
</g>
<g transform="translate(30 21)" fill="none" stroke="${hue}" stroke-width="1.6" stroke-linecap="round">
<circle r="7.5" opacity="0.45"/><path d="M0 0L0 -6.5M0 0L5.6 3.3M0 0L-5.6 3.3"/><circle r="1.4" fill="${hue}" stroke="none"/>
</g>
<text y="26" font-family="${MONO}" font-size="12.5"><tspan x="46" fill="#eef2f8" font-weight="700">${escape(catalog.marketplace)}</tspan><tspan fill="#677185"> / </tspan><tspan fill="#d5dbe6">${escape(name)}</tspan></text>
<text x="${WIDTH - 24}" y="26" text-anchor="end" font-family="${MONO}" font-size="10.5" letter-spacing="1.4" fill="#677185">${escape(tag.toUpperCase())}</text>
<g font-family="${MONO}" font-size="13">
${lines.map(renderLine).join('\n')}
</g>
</svg>
`
}

mkdirSync(join(root, 'docs', 'previews'), { recursive: true })

for (const mod of catalog.mods) {
  writeFileSync(
    join(root, 'docs', 'previews', `${mod.name}.svg`),
    frame({
      name: mod.name,
      tag: text(catalog.groups[mod.group] ?? catalog.categories[mod.category]),
      hue: hueOf(mod),
      lines: mod.preview,
    }),
  )
}

writeFileSync(
  join(root, 'docs', 'cockpit.svg'),
  frame({ name: 'full panel', tag: text(catalog.categories.panel), hue: HUE.session, lines: catalog.hero }),
)

const README = { en: 'README.md', pt: 'README.pt-BR.md', es: 'README.es.md' }
const LANGUAGE = { en: 'English', pt: 'Português', es: 'Español' }

const catalogFor = lang => {
  const inCategory = key => catalog.mods.filter(mod => mod.category === key)

  const index = Object.entries(catalog.categories)
    .map(([key, title]) => {
      const names = inCategory(key).map(mod => `[\`${mod.name}\`](#${mod.name})`)

      return `| **${text(title, lang)}** (${names.length}) | ${names.join(' · ')} |`
    })
    .join('\n')

  const sections = Object.entries(catalog.categories)
    .map(([key, title]) => {
      const entries = inCategory(key).map(
        mod => `### \`${mod.name}\`

${text(mod.description, lang)}.

\`\`\`
/plugin install ${mod.name}@${catalog.marketplace}
\`\`\`

![${mod.name}](docs/previews/${mod.name}.svg)
`,
      )

      return `## ${text(title, lang)} (${entries.length})\n\n${entries.join('\n')}`
    })
    .join('\n')

  return `| | |\n| --- | --- |\n${index}\n\n${sections}`
}

const switcher = lang =>
  catalog.languages.map(one => (one === lang ? `**${LANGUAGE[one]}**` : `[${LANGUAGE[one]}](${README[one]})`)).join(' · ')

const count = key => catalog.mods.filter(mod => mod.category === key && mod.hub !== true).length

for (const lang of catalog.languages) {
  const template = readFileSync(join(root, 'docs', 'readme', `${lang}.md`), 'utf8')

  writeFileSync(
    join(root, README[lang]),
    template
      .replaceAll('{{languages}}', switcher(lang))
      .replaceAll('{{total}}', String(catalog.mods.length))
      .replaceAll('{{panels}}', String(count('panel')))
      .replaceAll('{{catalog}}', catalogFor(lang)),
  )
}

console.log(`${catalog.mods.length} previews in docs/previews and ${catalog.languages.length} READMEs written`)
