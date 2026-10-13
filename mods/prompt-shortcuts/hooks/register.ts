import type { Register } from 'claude-code'

const SHORTCUTS: Record<string, string> = {
  fix: 'Encontre a causa raiz do erro abaixo, corrija e explique em uma linha o que estava errado.',
  test: 'Escreva testes para o código abaixo cobrindo caminho feliz, bordas e erros, e rode-os.',
  review: 'Revise o diff atual procurando bugs, regressões e riscos de segurança. Liste por severidade.',
  explain: 'Explique o código abaixo passo a passo, como para alguém novo no projeto.',
  refactor: 'Refatore o código abaixo para clean code e performance, sem mudar o comportamento.',
  doc: 'Documente o código abaixo no padrão de comentários já usado no repositório.',
  commit: 'Faça o commit das alterações atuais com uma mensagem no padrão do histórico do repositório.',
}

const PATTERN = /^::([a-z]+)\b\s*/

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'shortcuts',
      description: 'Lista os atalhos de prompt (::fix, ::test, ::review...)',
    })

    return next(e)
  })

  on('command.run', { command: 'shortcuts' }, () => ({
    text: Object.entries(SHORTCUTS)
      .map(([name, text]) => `::${name}  →  ${text}`)
      .join('\n'),
  }))

  on('prompt.submit', ($, e, next) => {
    const name = PATTERN.exec(e.text)?.[1]
    const expansion = name === undefined ? undefined : SHORTCUTS[name]

    if (expansion === undefined) {
      return next(e)
    }

    const rest = e.text.replace(PATTERN, '').trim()

    return next({ ...e, text: rest === '' ? expansion : `${expansion}\n\n${rest}` })
  })
}
