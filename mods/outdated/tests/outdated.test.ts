import { expect, test } from 'claude-code/testing'

const run = {
  command: 'outdated',
  args: '',
  origin: { kind: 'composer' } as const,
  presentation: { isFullscreen: true, columns: 120 },
}

const npm = (on: any, exitCode: number, stdout: string, stderr = '', os: string | undefined = undefined) => {
  on('env.get', () => ({ value: os }))
  on('process.run', () => ({ value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false } }))
}

const REPORT = JSON.stringify({
  typescript: { current: '5.4.5', wanted: '5.4.5', latest: '5.6.2' },
  react: { current: '18.2.0', wanted: '18.3.1', latest: '19.1.0' },
  lodash: { wanted: '4.17.21', latest: '4.17.21' },
})

test('prints an aligned table and counts the major jumps, though npm exits 1', async ($, on) => {
  npm(on, 1, REPORT)

  expect((await $.command.run(run)).text).toBe(
    [
      'package     current  wanted   latest',
      'lodash      -        4.17.21  4.17.21',
      'react       18.2.0   18.3.1   19.1.0',
      'typescript  5.4.5    5.4.5    5.6.2',
      '3 outdated, 1 major jump',
    ].join('\n'),
  )
})

test('says when everything is up to date', async ($, on) => {
  npm(on, 0, '')

  expect((await $.command.run(run)).text).toBe('Every dependency is up to date.')
})

test('wraps npm in cmd on Windows', async ($, on) => {
  let argv: readonly string[] = []
  on('env.get', () => ({ value: 'Windows_NT' }))
  on('process.run', (_, e) => {
    argv = e.argv

    return { value: { exitCode: 0, stdout: '{}', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  await $.command.run(run)
  expect(argv).toEqual(['cmd', '/c', 'npm', 'outdated', '--json'])
})

test('reports a failure that printed no report', async ($, on) => {
  npm(on, 1, '', 'npm ERR! code ENOENT\nmore')

  expect((await $.command.run(run)).text).toBe('npm outdated failed: npm ERR! code ENOENT')
})

test('speaks the language set in the hub', async ($, on) => {
  npm(on, 1, REPORT)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const text = (await $.command.run(run)).text ?? ''
  expect(text).toContain('pacote')
  expect(text).toContain('3 desatualizados, 1 salto maior')
})

test('says npm is not found when it cannot start', async ($, on) => {
  on('env.get', () => ({ value: undefined }))
  on('process.run', () => {
    throw new Error('spawn npm ENOENT')
  })

  expect((await $.command.run(run)).text).toBe('npm not found.')
})

test('reports output that is not JSON by its first line', async ($, on) => {
  npm(on, 1, 'npm WARN something\nnext', '')
  expect((await $.command.run(run)).text).toBe('npm outdated failed: npm WARN something')
})

test('prefers stderr when the report is not JSON', async ($, on) => {
  npm(on, 1, '<html>', 'npm ERR! network\nretry')
  expect((await $.command.run(run)).text).toBe('npm outdated failed: npm ERR! network')
})

test('counts a jump from 0.x and pluralizes the jumps', async ($, on) => {
  npm(
    on,
    1,
    JSON.stringify({
      a: { current: '0.9.0', wanted: '0.9.4', latest: '1.0.0' },
      b: { current: '2.0.0', wanted: '2.0.0', latest: '3.0.0-beta.1' },
      c: { current: 'git', wanted: 'git', latest: '2.0.0' },
    }),
  )

  const text = (await $.command.run(run)).text ?? ''
  expect(text.split('\n').at(-1)).toBe('3 outdated, 2 major jumps')
})

test('an empty report object is up to date', async ($, on) => {
  npm(on, 0, '{}\n')
  expect((await $.command.run(run)).text).toBe('Every dependency is up to date.')
})

test('speaks Spanish when the hub says so', async ($, on) => {
  let lang = 'es'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))
  npm(on, 1, JSON.stringify({ x: { current: '1.0.0', wanted: '1.0.1', latest: '1.0.1' } }))

  const text = (await $.command.run(run)).text ?? ''
  expect(text.split('\n')[0]).toBe('paquete  actual  deseada  última')
  expect(text).toContain('1 desactualizados, 0 saltos mayores')

  lang = 'pt'
  expect((await $.command.run(run)).text).toContain('0 saltos maiores')
})
