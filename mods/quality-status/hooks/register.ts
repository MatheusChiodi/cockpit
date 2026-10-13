import type { EngineInterface, Register } from 'claude-code'

// turbina: liga/desliga pelo painel /turbina
const OFF = { plugin: 'turbina', key: 'off' } as const

const isOff = async ($: EngineInterface): Promise<boolean> =>
  ((await $.state.get(OFF)).value ?? []).includes('quality-status')

const show = async ($: EngineInterface, text: string | undefined): Promise<void> => {
  $.ui.status((await isOff($)) ? undefined : text)
}

const CHECKS: readonly { label: string; pattern: RegExp }[] = [
  { label: 'lint', pattern: /\b(eslint|ruff|rubocop|golangci-lint)\b|\bbiome\s+(check|lint)\b|\b(npm|pnpm|yarn|bun)\s+(run\s+)?lint\b/ },
  { label: 'tipos', pattern: /\b(tsc|mypy|pyright)\b|\b(npm|pnpm|yarn|bun)\s+(run\s+)?(typecheck|type-check|types)\b/ },
  {
    label: 'build',
    pattern:
      /\b(npm|pnpm|yarn|bun)\s+(run\s+)?build\b|\b(vite|next|nuxt|astro|expo)\s+build\b|\b(cargo|go|dotnet|gradle|\.\/gradlew)\s+build\b|\bmvn\s+(package|compile)\b/,
  },
]

// Última execução de cada checagem, sempre à vista: lint ✓ · tipos ✗ · build ✓
const results = new Map<string, boolean>()

const watch = async <R extends { deny?: string; isError?: boolean }>(
  $: EngineInterface,
  command: string,
  run: () => Promise<R>,
): Promise<R> => {
  const ran = await run()
  const matched = CHECKS.filter(check => check.pattern.test(command))

  if (ran.deny === undefined && matched.length > 0) {
    for (const check of matched) {
      results.set(check.label, ran.isError !== true)
    }

    void show($, 
      CHECKS.filter(check => results.has(check.label))
        .map(check => `${check.label} ${results.get(check.label) === true ? '✓' : '✗'}`)
        .join(' · '),
    )
  }

  return ran
}

export const register: Register = on => {
  on('state.set', { plugin: 'turbina', key: 'off' }, async ($, e, next) => {
    const set = await next(e)
    await show($, undefined)

    return set
  })

  on('tool.call', { tool: 'Bash' }, ($, e, next) => watch($, e.command, () => next(e)))

  on('tool.call', { tool: 'PowerShell' }, ($, e, next) => watch($, e.command, () => next(e)))
}
