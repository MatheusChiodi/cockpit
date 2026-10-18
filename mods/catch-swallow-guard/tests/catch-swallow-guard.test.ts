import { expect, test } from 'claude-code/testing'

const ANSWER = { result: undefined as never }

const BLOCKED: readonly [string, string, string][] = [
  ['a.ts', 'try { run() } catch (e) {}', 'an empty catch block'],
  ['a.ts', 'try { run() } catch {\n  }', 'an empty catch block'],
  ['a.js', 'load().catch(() => {})', 'an empty catch block'],
  ['A.java', 'try { run(); } catch (IOException e) { }', 'an empty catch block'],
  ['a.py', 'try:\n    run()\nexcept Exception:\n    pass', 'an except that only passes'],
  ['a.py', 'try:\n    run()\nexcept:  pass', 'an except that only passes'],
]

const ALLOWED: readonly [string, string][] = [
  ['a.ts', 'try { run() } catch (e) { log(e) }'],
  ['a.ts', 'try { run() } catch { /* the cache may be missing */ }'],
  ['a.ts', 'load().catch(() => undefined)'],
  ['a.ts', 'load().catch(error => report(error))'],
  ['a.py', 'try:\n    run()\nexcept ValueError:\n    pass  # ok\n    log()'],
  ['a.py', 'except KeyError:\n    return None'],
  ['notes.md', 'catch (e) {}'],
]

test('refuses an edit that adds a swallowed error', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  for (const [file_path, new_string, what] of BLOCKED) {
    const answer = await $.tool.call({ tool: 'Edit', file_path, old_string: 'x', new_string, tool_use_id: `b-${new_string}` })
    expect(answer.deny, new_string).toContain(`catch-swallow-guard blocked the edit: it adds ${what}`)
  }
})

test('refuses a Write that holds one', async ($, on) => {
  on('tool.call', { tool: 'Write' }, () => ANSWER)

  const answer = await $.tool.call({ tool: 'Write', file_path: 'a.ts', content: 'try { a() } catch (e) {}', tool_use_id: 'w-1' })
  expect(answer.deny).toContain('an empty catch block')
})

test('lets handled errors through, and a swallow the edit did not add', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  for (const [file_path, new_string] of ALLOWED) {
    const answer = await $.tool.call({ tool: 'Edit', file_path, old_string: 'x', new_string, tool_use_id: `a-${new_string}` })
    expect(answer.deny, new_string).toBeUndefined()
  }

  const kept = await $.tool.call({
    tool: 'Edit',
    file_path: 'a.ts',
    old_string: 'try { a() } catch (e) {}',
    new_string: 'try { b() } catch (e) {}',
    tool_use_id: 'k-1',
  })
  expect(kept.deny).toBeUndefined()
})

test('speaks the language set in the hub', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: 'pt', version: 1 } }))

  const answer = await $.tool.call({
    tool: 'Edit',
    file_path: 'a.ts',
    old_string: 'x',
    new_string: 'try { a() } catch (e) {}',
    tool_use_id: 'pt-1',
  })
  expect(answer.deny).toContain('catch-swallow-guard bloqueou a edição: ela adiciona um bloco catch vazio')
})

const edit = (file_path: string, old_string: string, new_string: string, id: string) =>
  ({ tool: 'Edit', file_path, old_string, new_string, tool_use_id: id }) as const

test('a second empty catch next to one that was already there is refused', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  const answer = await $.tool.call(
    edit('a.ts', 'try { a() } catch (e) {}', 'try { a() } catch (e) {}\ntry { b() } catch {}', 'two-1'),
  )
  expect(answer.deny).toContain('an empty catch block')
})

test('judges Kotlin, C#, Vue and Python stub files, and an except with an ellipsis', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)

  for (const [file_path, new_string] of [
    ['A.kt', 'try { run() } catch (e: Exception) {}'],
    ['A.cs', 'try { Run(); } catch (Exception) { }'],
    ['A.vue', 'fetch(url).catch(err => {})'],
    ['a.pyi', 'try:\n    run()\nexcept OSError:\n    ...'],
  ] as const) {
    expect((await $.tool.call(edit(file_path, 'x', new_string, `t-${file_path}`))).deny, file_path).toBeDefined()
  }
})

test('a refused edit never reaches the tool; other file types pass untouched', async ($, on) => {
  let ran = 0
  on('tool.call', { tool: 'Write' }, () => {
    ran += 1

    return ANSWER
  })

  await $.tool.call({ tool: 'Write', file_path: 'a.ts', content: 'try {} catch {}', tool_use_id: 'r-1' })
  expect(ran).toBe(0)

  const go = await $.tool.call({ tool: 'Write', file_path: 'script.rb', content: 'begin; rescue; end; catch (e) {}', tool_use_id: 'r-2' })
  expect(go.deny).toBeUndefined()
  expect(ran).toBe(1)
})

test('speaks Spanish, and Portuguese for an except that passes', async ($, on) => {
  on('tool.call', { tool: 'Edit' }, () => ANSWER)
  let lang = 'es'
  on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ value: { value: lang, version: 1 } }))

  expect((await $.tool.call(edit('a.ts', 'x', 'try { a() } catch (e) {}', 'es-1'))).deny).toBe(
    'catch-swallow-guard bloqueó la edición: añade un bloque catch vacío. Un error tragado oculta fallos; trátalo, regístralo o relánzalo.',
  )
  expect((await $.tool.call(edit('a.py', 'x', 'except:\n    pass', 'es-2'))).deny).toContain('añade un except que solo hace pass')

  lang = 'pt'
  expect((await $.tool.call(edit('a.py', 'x', 'except:\n    pass', 'pt-2'))).deny).toContain('ela adiciona um except que só faz pass')
})
