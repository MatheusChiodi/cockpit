// Folds catalog-parts/*.json into mods.json and removes the parts.
// A part is an array of mod entries: a new name is appended, a known name has its fields updated
// (descriptions are merged per language).
// Usage: node scripts/merge-catalog.mjs
import { rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { json, loadCatalog, loadParts, root } from './lib.mjs'

const catalog = loadCatalog()
const byName = new Map(catalog.mods.map(mod => [mod.name, mod]))
let added = 0
let updated = 0

for (const part of loadParts()) {
  const known = byName.get(part.name)

  if (known === undefined) {
    catalog.mods.push(part)
    byName.set(part.name, part)
    added += 1
    continue
  }

  const description =
    typeof part.description === 'object' ? { ...known.description, ...part.description } : (part.description ?? known.description)
  Object.assign(known, part, { description })
  updated += 1
}

writeFileSync(join(root, 'mods.json'), json(catalog))
rmSync(join(root, 'catalog-parts'), { recursive: true, force: true })
console.log(`${added} added, ${updated} updated; ${catalog.mods.length} mods in total`)
