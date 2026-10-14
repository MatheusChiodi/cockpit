import type { EngineInterface, Register } from 'claude-code'

// Read once per module load: the tsconfig does not change mid-session.
// The section is read by the model only: English, not translated.
const cache: { text: string | undefined } = { text: undefined }

// tsconfig allows comments and trailing commas.
const stripJsonc = (text: string): string => {
  let out = ''
  let inString = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i] ?? ''
    const next = text[i + 1]

    if (inString) {
      out += c
      inString = !(c === '"' && text[i - 1] !== '\\')
    } else if (c === '"') {
      out += c
      inString = true
    } else if (c === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') {
        i++
      }
    } else if (c === '/' && next === '*') {
      i = text.indexOf('*/', i + 2)
      i = i === -1 ? text.length : i + 1
    } else {
      out += c
    }
  }

  return out.replace(/,(\s*[}\]])/g, '$1')
}

type Options = Record<string, any>

// The compiler options of tsconfig.json merged over the ones it extends, following files in the project root only.
const optionsOf = async ($: EngineInterface, root: string, file: string, depth: number): Promise<Options | undefined> => {
  const text = await $.fs.read(`${root}/${file}`).catch(() => undefined)

  if (typeof text !== 'string') {
    return undefined
  }

  try {
    const config = JSON.parse(stripJsonc(text)) as { extends?: unknown; compilerOptions?: Options }
    const parent = typeof config.extends === 'string' && /^\.\/[^/]+$/.test(config.extends) && depth < 3
      ? await optionsOf($, root, config.extends.slice(2).replace(/(\.json)?$/, '.json'), depth + 1)
      : undefined

    return { ...parent, ...config.compilerOptions }
  } catch {
    return undefined
  }
}

const describe = async ($: EngineInterface): Promise<string> => {
  const root = await $.session.root()
  const options = await optionsOf($, root, 'tsconfig.json', 0)

  if (options === undefined) {
    return ''
  }

  const lines: string[] = []

  if (options.strict === true) {
    lines.push('strict mode is on: implicit any and unchecked null are errors. Type things properly; do not reach for `any` or `!` to silence them.')
  }

  if (options.noUncheckedIndexedAccess === true) {
    lines.push('noUncheckedIndexedAccess is on: indexing an array or record gives `T | undefined`, so narrow before use.')
  }

  if (options.exactOptionalPropertyTypes === true) {
    lines.push('exactOptionalPropertyTypes is on: an optional property cannot be assigned `undefined` explicitly.')
  }

  if (options.verbatimModuleSyntax === true || options.isolatedModules === true || options.importsNotUsedAsValues === 'error') {
    lines.push('Imports that are only types must use `import type` (or `import { type X }`).')
  }

  const resolution = String(options.moduleResolution ?? '').toLowerCase()

  if (resolution === 'node16' || resolution === 'nodenext') {
    lines.push('moduleResolution is NodeNext: relative imports need the `.js` extension, even from `.ts` files.')
  } else if (resolution === 'bundler') {
    lines.push('moduleResolution is bundler: relative imports have no file extension.')
  }

  const aliases = Object.entries((options.paths ?? {}) as Record<string, unknown>)
    .filter((entry): entry is [string, string[]] => Array.isArray(entry[1]) && typeof entry[1][0] === 'string')
    .map(([key, targets]) => `${key} -> ${targets[0]}`)

  if (aliases.length > 0) {
    lines.push(`Path aliases: ${aliases.join(', ')}. Import through them instead of long ../ chains.`)
  }

  return lines.length === 0 ? '' : `# TypeScript configuration (tsconfig.json)\n${lines.map(line => `- ${line}`).join('\n')}`
}

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    cache.text ??= await describe($)

    return cache.text === ''
      ? composed
      : { sections: [...composed.sections, { id: 'ts-config-context:tsconfig', text: cache.text, scope: 'session' }] }
  })
}
