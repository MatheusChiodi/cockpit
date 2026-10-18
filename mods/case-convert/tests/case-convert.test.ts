import { expect, test } from 'claude-code/testing'

const run = (args: string) => ({
  command: 'case',
  args,
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
})

test('converts to each style and copies the result', async ($, on) => {
  const copied: string[] = []
  on('ui.copy', (_, e) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })

  await $.command.run(run('snake userProfileId'))
  await $.command.run(run('camel user_profile-id'))
  await $.command.run(run('pascal user profile id'))
  await $.command.run(run('kebab XMLHttpRequest2'))
  await $.command.run(run('constant maxRetryCount'))
  expect(copied).toEqual(['user_profile_id', 'userProfileId', 'UserProfileId', 'xml-http-request-2', 'MAX_RETRY_COUNT'])
})

test('makes a slug without accents or punctuation', async ($, on) => {
  const copied: string[] = []
  on('ui.copy', (_, e) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })

  await $.command.run(run('slug  Olá, Mundo! Ação é rápida '))
  expect(copied[0]).toBe('ola-mundo-acao-e-rapida')
})

test('shows every style when none is given', async ($) => {
  const answer = await $.command.run(run('fooBar'))
  expect(answer.text).toContain('snake    foo_bar')
  expect(answer.text).toContain('pascal   FooBar')
  expect(answer.text).toContain('slug     foo-bar')
})

test('says when the text has nothing to convert', async ($) => {
  expect((await $.command.run(run('snake ---'))).text).toContain('Nothing to convert')
})

test('uses the mouse selection when only the style is typed', async ($, on) => {
  on('ui.copy', () => ({ value: { isCopied: true } }))
  on('ui.selection', () => ({ value: { text: 'helloWorld' } }))

  expect((await $.command.run(run('kebab'))).text).toContain('hello-world')
})

test('prints the usage with no text and no selection', async ($, on) => {
  on('ui.selection', () => ({ value: undefined }))

  expect((await $.command.run(run(''))).text).toContain('Usage: /case')
})

test('speaks the language set in the hub', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  expect((await $.command.run(run('snake ---'))).text).toContain('Nada para converter')
})

test('keeps accents outside the slug style', async ($, on) => {
  const copied: string[] = []
  on('ui.copy', (_, e) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })

  await $.command.run(run('snake Ação rápida'))
  expect(copied[0]).toBe('ação_rápida')
})

test('reads the style name in any case', async ($, on) => {
  const copied: string[] = []
  on('ui.copy', (_, e) => {
    copied.push(e.text)

    return { value: { isCopied: true } }
  })

  await $.command.run(run('CONSTANT http status code'))
  expect(copied[0]).toBe('HTTP_STATUS_CODE')
})

test('shows every style for the selection when nothing is typed', async ($, on) => {
  on('ui.selection', () => ({ value: { text: ' user_id ' } }))

  const answer = await $.command.run(run(''))
  expect(answer.text).toContain('camel    userId')
  expect(answer.text).toContain('constant USER_ID')
})

test('prints the usage when the selection cannot be read', async ($, on) => {
  on('ui.selection', () => {
    throw new Error('unsupported')
  })

  expect((await $.command.run(run('camel'))).text).toContain('Usage: /case')
})

test('registers /case and speaks Spanish', async ($, on) => {
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'es', version: 1 } }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  const hints: string[] = []
  on('command.register', (_$, e) => {
    hints.push(`${e.name} ${e.argumentHint}`)

    return { value: { command: e.name } }
  })
  on('ui.copy', () => ({ value: { isCopied: true } }))
  on('ui.selection', () => ({ value: undefined }))

  await $.session.start({ cwd: '/p', surface: 'terminal', isInteractive: true })
  expect(hints).toEqual(['case [camel|snake|kebab|pascal|constant|slug] <texto>'])
  expect((await $.command.run(run('kebab fooBar'))).text).toBe('foo-bar\nCopiado al portapapeles.')
  expect((await $.command.run(run(''))).text).toContain('Uso: /case')
  expect((await $.command.run(run('slug !!!'))).text).toBe('Nada que convertir: el texto no tiene letras ni dígitos.')
})
