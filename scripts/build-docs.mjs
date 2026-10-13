// Gera docs/previews/<mod>.svg (mockup de terminal de cada mod), docs/cockpit.svg e o catálogo do README.md.
// Uso: node scripts/build-docs.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalog = JSON.parse(readFileSync(join(root, 'mods.json'), 'utf8'))

const WIDTH = 760
const CHAR = 7.83
const LINE = 21
const TOP = 66
const LEFT = 24
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Cascadia Mono',monospace"

// Mesma paleta do kit: um matiz por assunto; verde, âmbar e vermelho só para estado.
const HUE = { git: '#b39df2', sessao: '#e58c62', projeto: '#74a8f5', dia: '#5fc9b8' }

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

const GROUP_HUE = { Git: HUE.git, Sessão: HUE.sessao, Projeto: HUE.projeto, 'Dia a dia': HUE.dia }

const CATEGORY_HUE = {
  seguranca: COLORS.err,
  interface: HUE.sessao,
  prompt: HUE.git,
  comandos: HUE.projeto,
  foco: HUE.dia,
}

const hueOf = mod => GROUP_HUE[mod.group] ?? CATEGORY_HUE[mod.category] ?? HUE.sessao

const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// "[[estilo|texto]]" marca um trecho; o resto da linha usa a cor padrão.
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

// Emojis ocupam duas células no terminal.
const cells = text => [...text].reduce((sum, char) => sum + (char.codePointAt(0) > 0x1f000 ? 2 : 1), 0)

const BOXED = {
  toast: { fill: '#1a2130', stroke: COLORS.accent, color: '#f6e7df' },
  notify: { fill: '#222a38', stroke: '#3b4660', color: COLORS.user },
  sel: { fill: '#35508a', stroke: 'none', color: '#ffffff' },
}

const renderLine = (line, row) => {
  const y = TOP + row * LINE
  const backgrounds = []
  const spans = []
  let column = 0

  for (const { style, text } of segments(line)) {
    const width = cells(text)
    const box = BOXED[style]

    if (box !== undefined) {
      backgrounds.push(
        `<rect x="${(LEFT + column * CHAR - 2).toFixed(1)}" y="${y - 15}" width="${(width * CHAR + 4).toFixed(1)}" height="${LINE}" rx="4" fill="${box.fill}" stroke="${box.stroke}"/>`,
      )
    }

    const weight = style === 'bold' || style === 'toast' ? ' font-weight="700"' : ''
    spans.push(
      // textLength fixa a largura em células: o alinhamento não depende da fonte do leitor.
      `<tspan x="${(LEFT + column * CHAR).toFixed(1)}" textLength="${(width * CHAR).toFixed(1)}" lengthAdjust="spacingAndGlyphs" fill="${box?.color ?? COLORS[style] ?? COLORS.text}"${weight}>${escape(text)}</tspan>`,
    )
    column += width
  }

  return `${backgrounds.join('')}<text y="${y}" xml:space="preserve">${spans.join('')}</text>`
}

// Moldura própria da Turbina: fio no matiz do assunto, rotor, nome do mod e a categoria à direita.
const frame = ({ name, tag, hue, lines }) => {
  const height = TOP + lines.length * LINE + 10

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="Prévia de ${escape(name)} no terminal">
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
<text y="26" font-family="${MONO}" font-size="12.5"><tspan x="46" fill="#eef2f8" font-weight="700">turbina</tspan><tspan fill="#677185"> / </tspan><tspan fill="#d5dbe6">${escape(name)}</tspan></text>
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
    frame({ name: mod.name, tag: mod.group ?? catalog.categories[mod.category], hue: hueOf(mod), lines: mod.preview }),
  )
}

writeFileSync(
  join(root, 'docs', 'cockpit.svg'),
  frame({ name: 'painel completo', tag: 'sempre visível', hue: HUE.sessao, lines: catalog.hero }),
)

const section = ([key, title]) => {
  const mods = catalog.mods.filter(mod => mod.category === key)
  const entries = mods.map(
    mod => `### \`${mod.name}\`

${mod.description}.

\`\`\`
/plugin install ${mod.name}@${catalog.marketplace}
\`\`\`

![Prévia do ${mod.name}](docs/previews/${mod.name}.svg)
`,
  )

  return `## ${title} (${mods.length})\n\n${entries.join('\n')}`
}

const index = Object.entries(catalog.categories)
  .map(([key, title]) => {
    const names = catalog.mods.filter(mod => mod.category === key).map(mod => `[\`${mod.name}\`](#${mod.name})`)

    return `| **${title}** (${names.length}) | ${names.join(' · ')} |`
  })
  .join('\n')

const generated = `<!-- catalogo:inicio (gerado por scripts/build-docs.mjs, não edite à mão) -->
| Categoria | Mods |
| --- | --- |
${index}

${Object.entries(catalog.categories).map(section).join('\n')}<!-- catalogo:fim -->`

const readmePath = join(root, 'README.md')
const readme = readFileSync(readmePath, 'utf8')
writeFileSync(
  readmePath,
  readme
    .replace(/<!-- catalogo:inicio[\s\S]*<!-- catalogo:fim -->/, generated)
    .replace(/\*\*\d+ mods para turbinar/, `**${catalog.mods.length} mods para turbinar`),
)

console.log(`${catalog.mods.length} prévias em docs/previews e catálogo do README atualizado`)
