// Liga um mod de painel ao painel de configuração: ele passa a ler turbina.off e some quando desligado.
// Idempotente. Uso: node scripts/add-toggle.mjs (aplica a todo mod da categoria "painel", menos o hub)
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalog = JSON.parse(readFileSync(join(root, 'mods.json'), 'utf8'))
const MARK = '// turbina: liga/desliga pelo painel /turbina'

const helper = (name, usesStatus) => `${MARK}
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('${name}')
${
  usesStatus
    ? `
const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}
`
    : ''
}`

const SWITCH_HOOK = `  on('state.set', { plugin: 'turbina', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

`

let changed = 0

for (const mod of catalog.mods.filter(one => one.category === 'painel' && one.hub !== true)) {
  const file = ['register.tsx', 'register.ts']
    .map(name => join(root, 'mods', mod.name, 'hooks', name))
    .find(existsSync)
  let source = readFileSync(file, 'utf8')

  if (source.includes(MARK)) {
    continue
  }

  const usesStatus = source.includes('$.ui.status(')
  const isBand = source.includes('if (e.props.hasSurvey || ')

  if (!usesStatus && !isBand) {
    throw new Error(`${mod.name}: não é faixa nem status line`)
  }

  if (!/import type \{[^}]*EngineInterface[^}]*\} from 'claude-code'/.test(source)) {
    source = source.replace(/import type \{ ([^}]*) \} from 'claude-code'/, "import type { EngineInterface, $1 } from 'claude-code'")
  }

  if (usesStatus) {
    source = source.replaceAll('$.ui.status(', 'void show($, ')
    source = source.replace(/(export const register: Register = on => \{\n)/, `$1${SWITCH_HOOK}`)
  }

  if (isBand) {
    source = source.replaceAll('if (e.props.hasSurvey || ', 'if (e.props.hasSurvey || (await isOff($)) || ')
  }

  // O helper entra logo depois do bloco de imports.
  const imports = [...source.matchAll(/^import .*$/gm)].at(-1)
  const at = imports.index + imports[0].length
  source = `${source.slice(0, at)}\n\n${helper(mod.name, usesStatus)}${source.slice(at).replace(/^\n+/, '\n')}`

  writeFileSync(file, source)
  changed += 1
}

console.log(`${changed} mods ligados ao painel de configuração`)
