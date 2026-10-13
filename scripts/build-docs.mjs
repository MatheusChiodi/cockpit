// Gera docs/previews/<mod>.svg (mockup de terminal de cada mod) e o catálogo do README.md.
// Uso: node scripts/build-docs.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalog = JSON.parse(readFileSync(join(root, 'mods.json'), 'utf8'))

const WIDTH = 760
const CHAR = 7.83
const LINE = 20
const TOP = 58
const LEFT = 22

const COLORS = {
  text: '#d8dee9',
  dim: '#6b7689',
  rule: '#3b4458',
  user: '#e6edf7',
  tool: '#7fd1a8',
  ok: '#7fd1a8',
  err: '#ff7a7a',
  warn: '#f2c06b',
  accent: '#d97757',
  bold: '#ffffff',
  btn: '#8fb8ff',
  cursor: '#d8dee9',
}

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
  toast: { fill: '#1d2433', stroke: '#d97757', color: '#f3e3dc' },
  notify: { fill: '#262c3a', stroke: '#4a5470', color: '#e6edf7' },
  sel: { fill: '#3a5a9c', stroke: 'none', color: '#ffffff' },
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
        `<rect x="${(LEFT + column * CHAR - 2).toFixed(1)}" y="${y - 14}" width="${(width * CHAR + 4).toFixed(1)}" height="${LINE}" rx="3" fill="${box.fill}" stroke="${box.stroke}"/>`,
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

const svg = mod => {
  const height = TOP + mod.preview.length * LINE + 14

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="Prévia do mod ${mod.name} no terminal">
<rect width="${WIDTH}" height="${height}" rx="10" fill="#141922"/>
<rect width="${WIDTH}" height="34" rx="10" fill="#1d2433"/>
<rect y="24" width="${WIDTH}" height="10" fill="#1d2433"/>
<circle cx="20" cy="17" r="6" fill="#ff5f57"/><circle cx="40" cy="17" r="6" fill="#febc2e"/><circle cx="60" cy="17" r="6" fill="#28c840"/>
<text x="${WIDTH / 2}" y="22" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="12" fill="#8792a8">claude — ${escape(mod.name)}</text>
<g font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,'Cascadia Mono',monospace" font-size="13">
${mod.preview.map(renderLine).join('\n')}
</g>
</svg>
`
}

mkdirSync(join(root, 'docs', 'previews'), { recursive: true })

for (const mod of catalog.mods) {
  writeFileSync(join(root, 'docs', 'previews', `${mod.name}.svg`), svg(mod))
}

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

    return `| **${title}** | ${names.join(' · ')} |`
  })
  .join('\n')

const generated = `<!-- catalogo:inicio (gerado por scripts/build-docs.mjs, não edite à mão) -->
| Categoria | Mods |
| --- | --- |
${index}

${Object.entries(catalog.categories).map(section).join('\n')}<!-- catalogo:fim -->`

const readmePath = join(root, 'README.md')
const readme = readFileSync(readmePath, 'utf8')
writeFileSync(readmePath, readme.replace(/<!-- catalogo:inicio[\s\S]*<!-- catalogo:fim -->/, generated))

console.log(`${catalog.mods.length} prévias em docs/previews e catálogo do README atualizado`)
