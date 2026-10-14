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
