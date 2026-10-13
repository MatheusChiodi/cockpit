// Gera plugin.json + hooks.json de cada mod e o marketplace.json a partir de mods.json.
// Uso: node scripts/build-manifests.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalog = JSON.parse(readFileSync(join(root, 'mods.json'), 'utf8'))
const json = value => `${JSON.stringify(value, null, 2)}\n`

const hub = catalog.mods.find(mod => mod.hub === true)
const panels = catalog.mods
  .filter(mod => mod.category === 'painel' && mod.hub !== true)
  .map(({ name, description, group = 'Geral' }) => ({ name, description, group }))
  .sort((a, b) => a.group.localeCompare(b.group, 'pt-BR'))

// A lista que o painel de configuração desenha: gerada, para nunca divergir do catálogo.
writeFileSync(
  join(root, 'mods', hub.name, 'hooks', 'panels.ts'),
  `// Gerado por scripts/build-manifests.mjs a partir de mods.json. Não edite à mão.
export const PANELS: readonly { name: string; description: string; group: string }[] = ${JSON.stringify(panels, null, 2)}
`,
)

const kit = `// Gerado por scripts/build-manifests.mjs a partir de kit/kit.tsx. Não edite à mão.
${readFileSync(join(root, 'kit', 'kit.tsx'), 'utf8')}`

const plugins = catalog.mods.map(mod => {
  const dir = join(root, 'mods', mod.name)
  const module = ['register.tsx', 'register.ts'].find(file => existsSync(join(dir, 'hooks', file)))

  if (module === undefined) {
    throw new Error(`${mod.name}: falta hooks/register.ts(x)`)
  }

  // Cada plugin é independente: quem usa o kit visual recebe a própria cópia.
  if (readFileSync(join(dir, 'hooks', module), 'utf8').includes("from './kit'")) {
    writeFileSync(join(dir, 'hooks', 'kit.tsx'), kit)
  }

  const manifest = {
    name: mod.name,
    version: catalog.version,
    description: mod.description,
    author: catalog.owner,
    keywords: ['claude-code', 'mod', mod.category],
  }

  if (existsSync(join(dir, 'types', 'index.d.ts'))) {
    manifest.types = './types/index.d.ts'
  }

  if (mod.category === 'painel' && mod.hub !== true) {
    manifest.dependencies = [hub.name]
  }

  mkdirSync(join(dir, '.claude-plugin'), { recursive: true })
  writeFileSync(join(dir, '.claude-plugin', 'plugin.json'), json(manifest))
  writeFileSync(join(dir, 'hooks', 'hooks.json'), json({ modules: [`./${module}`] }))

  return {
    name: mod.name,
    source: `./mods/${mod.name}`,
    description: mod.description,
    category: mod.category,
  }
})

mkdirSync(join(root, '.claude-plugin'), { recursive: true })
writeFileSync(
  join(root, '.claude-plugin', 'marketplace.json'),
  json({
    name: catalog.marketplace,
    description: catalog.description,
    owner: catalog.owner,
    plugins,
  }),
)

console.log(`${plugins.length} mods em ${catalog.marketplace}`)
