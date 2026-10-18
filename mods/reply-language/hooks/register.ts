import type { EngineInterface, Register } from 'claude-code'

// cockpit: the language set in /cockpit (nothing is added when the hub was never installed)
const LANG = { plugin: 'cockpit', key: 'lang' } as const

// Read by the model only: English, not translated.
const INSTRUCTIONS = {
  en: 'Always answer in English.',
  pt: 'Always answer in Brazilian Portuguese, with correct accents.',
  es: 'Always answer in neutral Spanish, with correct accents and opening ¿ and ¡.',
} as const

const section = async ($: EngineInterface) => {
  const lang = (await $.state.get(LANG)).value

  return lang === undefined
    ? undefined
    : ({
        id: 'reply-language:language',
        text: [
          '# Language',
          INSTRUCTIONS[lang] ?? INSTRUCTIONS.en,
          'Technical terms, API names, commands and code identifiers stay in the original.',
          'Commit messages and code comments follow the language already used in the repository.',
        ].join('\n'),
        scope: 'session',
      } as const)
}

export const register: Register = on => {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const added = await section($)

    return added === undefined ? composed : { sections: [...composed.sections, added] }
  })
}
