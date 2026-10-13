import type { EngineInterface, Register } from 'claude-code'

const KNOWN: readonly (readonly [string, string])[] = [
  ['next', 'Next.js'],
  ['react-native', 'React Native'],
  ['expo', 'Expo'],
  ['react', 'React'],
  ['vue', 'Vue'],
  ['svelte', 'Svelte'],
  ['@angular/core', 'Angular'],
  ['tailwindcss', 'Tailwind CSS'],
  ['typescript', 'TypeScript'],
  ['vite', 'Vite'],
  ['express', 'Express'],
  ['fastify', 'Fastify'],
  ['@nestjs/core', 'NestJS'],
  ['prisma', 'Prisma'],
  ['drizzle-orm', 'Drizzle'],
  ['vitest', 'Vitest'],
  ['jest', 'Jest'],
  ['@playwright/test', 'Playwright'],
  ['zustand', 'Zustand'],
  ['@reduxjs/toolkit', 'Redux Toolkit'],
]

const FILES: readonly (readonly [string, string])[] = [
  ['pom.xml', 'Java (Maven)'],
  ['build.gradle', 'Java/Kotlin (Gradle)'],
  ['requirements.txt', 'Python'],
  ['pyproject.toml', 'Python'],
  ['Cargo.toml', 'Rust'],
  ['go.mod', 'Go'],
  ['app.json', 'Expo (app.json)'],
  ['eas.json', 'EAS Build'],
]

// Lido uma vez por carga do módulo: a stack não muda no meio da sessão.
const cache: { text: string | undefined } = { text: undefined }

const detect = async ($: EngineInterface): Promise<string> => {
  const root = await $.session.root()
  const found: string[] = []
  const manifest = await $.fs.read(`${root}/package.json`).catch(() => undefined)

  if (manifest !== undefined) {
    try {
      const parsed = JSON.parse(manifest) as { dependencies?: object; devDependencies?: object }
      const deps = new Set([...Object.keys(parsed.dependencies ?? {}), ...Object.keys(parsed.devDependencies ?? {})])
      found.push(...KNOWN.filter(([name]) => deps.has(name)).map(([, label]) => label))
    } catch {
      // package.json inválido: segue só com os arquivos de marcação.
    }
  }

  for (const [file, label] of FILES) {
    if (await $.fs.exists(`${root}/${file}`)) {
      found.push(label)
    }
  }

  return [...new Set(found)].join(', ')
}

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    cache.text ??= await detect($)

    return cache.text === ''
      ? composed
      : {
          sections: [
            ...composed.sections,
            {
              id: 'stack-context:stack',
              text: `# Stack deste projeto\n${cache.text}.\nUse os padrões e as APIs dessas ferramentas; não proponha trocar a stack sem que peçam.`,
              scope: 'session',
            },
          ],
        }
  })
}
