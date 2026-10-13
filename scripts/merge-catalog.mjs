// Junta fragmentos de catálogo (arrays de mods em catalog-parts/*.json) ao mods.json e apaga os fragmentos.
// Uso: node scripts/merge-catalog.mjs
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const parts = join(root, 'catalog-parts')
const catalog = JSON.parse(readFileSync(join(root, 'mods.json'), 'utf8'))
const known = new Set(catalog.mods.map(mod => mod.name))
let added = 0

for (const file of existsSync(parts) ? readdirSync(parts).filter(name => name.endsWith('.json')).sort() : []) {
  for (const mod of JSON.parse(readFileSync(join(parts, file), 'utf8'))) {
    if (!known.has(mod.name)) {
      catalog.mods.push(mod)
      known.add(mod.name)
      added += 1
    }
  }
}

writeFileSync(join(root, 'mods.json'), `${JSON.stringify(catalog, null, 2)}\n`)
rmSync(parts, { recursive: true, force: true })
console.log(`${added} mods adicionados; total ${catalog.mods.length}`)
