# Status — varredura de testes + correção de bugs (PAUSADO)

Pausado em 2026-10-18 a pedido do usuário. Todos os agentes (tester-1..10) foram **encerrados** (TaskStop). G1 e G2 não entregaram relatório: ao retomar, rodar `node scripts/mod.mjs` nos mods desses grupos para saber o estado real (algum arquivo de teste pode ter ficado incompleto).

## Objetivo
1. 10 agentes (`cockpit-mod-builder`) testam os 386 mods e acrescentam testes unitários (≥ +3 por mod), mexendo só em `mods/<nome>/tests/`.
2. Bugs reais encontrados são corrigidos, **um commit por bug** (correção + teste de regressão).
3. Commit separado com os testes novos restantes.
4. `npm run check` e então `git push`.

## Git
- Branch: `fix/test-sweep` (o hook `main-branch-guard` bloqueia commit em `main`). Ainda **sem push**.
- Commits feitos:
  - `207d695 fix(reply-language): fall back to English for an unknown language`
- Fora dos commits (mudanças pré-existentes do usuário): `.claude-plugin/marketplace.json`, `mods.json`.
- Mods não rastreados (catalog-pending): bug neles exige primeiro um commit `feat(...): add <mod>` e depois o `fix`.
- Alguns arquivos de teste novos estão em CRLF; o git normaliza para LF no `add`.

## Progresso dos testes (mods com testes novos / total, testes antes → depois)
| Grupo | Mods | Testes | Pendentes |
|---|---|---|---|
| 1 | 38/39 | 164 → 342 | turn-history |
| 2 | 35/38 | 164 → 344 | a11y-rules, agent-trivial-note, key-hints |
| 3 | 38/38 | 159 → 308 | — |
| 4 | 38/38 | 147 → 333 | — |
| 5 | 38/38 | 150 → 351 | — |
| 6 | 39/39 | 163 → 353 | — |
| 7 | 39/39 | 146 → 344 | — |
| 8 | 39/39 | 156 → 357 | — |
| 9 | 39/39 | 151 → 344 | — (relatório final entregue, 0 falhas) |
| 10 | 39/39 | 170 → 393 | — (relatório final entregue, 0 falhas) |
| **Total** | **382/386** | **1570 → 3469** | |

Relatórios de pausa recebidos (após a tabela acima):
- G3: 38 mods; verificação final 36 ok + **2 FAIL de tsc nos testes novos**: `git-band` (tests 100/103/120/154: `argv` deve ser `readonly string[]`, `state.git` como `Record<string,string>`) e `tree` (tests:67: falta `isLink: false` no helper `file()`). Correção não autorizada ainda (pausa).
- G5: 38 mods ok, +195 testes, baseline sem falhas. Obs.: testes antigos do cockpit fixam "52 painéis".
- G7: 39 mods; final 38 ok, `alarms` FAIL no teste antigo "rings once a day" (timeout 5s, instável sob carga — já falhava no baseline).
- G8: 39 mods ok, 159 → 372 testes (`scratchpad/g8-final.txt`).
- G4: 38 mods ok (114/114), 151 → 352 testes, baseline sem falhas.
- tester-10: bugs 2–7 corrigidos, os 7 mods passam em mod.mjs; arquivos por bug: debugger-guard (hooks/register.ts + test), priciest-turn (register.ts + test, Math.min(100,…)), uuid (register.ts + strings.ts + test, string noClipboard), agent-straggler (register.ts + test), reset-countdown (register.ts + test), find-file (strings.ts + test), conventions-context (register.ts + test).
- G6: 39 mods ok, 163 → 354 testes, baseline sem falhas.
- Faltam relatórios de pausa: G1, G2.
- Aviso: `main-branch-guard` bloqueia comandos Bash com "git push"/"commit" no texto (mesmo em heredoc) quando em `main`; na branch `fix/test-sweep` o commit funcionou.

Listas dos grupos: scratchpad da sessão (`group1.txt` … `group10.txt`). Relatórios finais ainda não recebidos: grupos 1–8 (3, 7 e 8 estavam na verificação final).

## Bugs encontrados
| # | Mod | Problema | Estado |
|---|---|---|---|
| 1 | reply-language `hooks/register.ts:22` | idioma desconhecido deixava a instrução vazia | **corrigido + commit 207d695** |
| 2 | debugger-guard `hooks/register.ts:19` | `binding.irb` reportado como `binding.pry` | **corrigido pelo tester-10, aguardando commit** |
| 3 | priciest-turn `hooks/register.ts:67` | % passa de 100 quando o total cai (reset) | **corrigido pelo tester-10, aguardando commit** |
| 4 | uuid `hooks/register.ts:42` + `strings.ts` | ignora `isCopied`, diz "copied" mesmo se falhar | **corrigido pelo tester-10, aguardando commit** |
| 5 | agent-straggler `hooks/register.ts:33` | falha em `agent.list` apaga todas as runs | **corrigido pelo tester-10, aguardando commit** |
| 6 | reset-countdown `hooks/register.ts:66` | `resetsAt` inválido → "resets NaNmin" | **corrigido pelo tester-10, aguardando commit** |
| 7 | find-file `strings.ts:7` / conventions-context `register.ts:36` | "1 files" / "1 lines" | **corrigido pelo tester-10, aguardando commit** (conventions-context não rastreado: precisa de commit feat antes) |

| 8 | install-ask `register.ts:12` | `pip install -r requirements.txt` pede confirmação (regex consome `-r` antes do lookahead) | pendente (G5) |
| 9 | cockpit `register.tsx:46` | `restore()` não filtra nomes de painel desconhecidos → contagem "N de M" errada | pendente (G5) |
| 10 | classname-build-note `register.ts:149` | `first.detail` sempre em inglês no toast | pendente (G5) |
| 11 | quality-status `register.ts:26` / tests-notify `register.ts:14` | `\b` antes de `./gradlew` nunca casa | pendente (G3) |
| 12 | layout-context `register.ts:45` | `cache.root` sem normalizar `\` → no Windows o layout não atualiza | pendente (G3) |
| 13 | break-reminder `register.ts:24` | 2º `session.start` duplica o timer (padrão pode existir em outros mods com `clock.every`) | pendente (G3) |
| 14 | oracle-paging-guard `register.ts:553` | `LIMIT #{n}` / `${n}` não pegos (`\b` após `}`) | pendente (G7) |
| 15 | untested-turn-toast `:77` / scatter-toast `:67` | `turn.complete` de subagente zera o turno principal | pendente (G8) |
| 16 | untested-turn-toast `:24` / scatter-toast `:45,52` | edição com isError (e negada no scatter) conta como alteração | pendente (G8) |
| 17 | pr-diff `register.ts:50` | coluna de deleções usa largura das adições → desalinha | pendente (G8) |

| 18 | git-status-line `register.ts:17` | branch cortada no 1º ponto (`release/1.2` → `release/1`) | pendente (G4) |
| 19 | spend-today `strings.ts` (es) | "1 sesion" sem acento | pendente (G4) |
| 20 | copy-last `strings.ts` (pt/es) | "Resposta copiado"/"Respuesta copiado" (teste antigo fixa o erro) | pendente (G4) |
| 21 | git-stash `register.ts:70` | `/gst list` fora de repo diz "No stashes." em vez de noGit | pendente (G4) |
| 22 | git-fixup `register.ts:22-23` | exit ≠ 0/1 de `git diff --cached --quiet` tratado como stage → "No such commit: HEAD" | pendente (G4) |
| 23 | java-rules / tailwind-rules | código morto (`depsOf`, `read`) — menor | pendente (G4) |

| 24 | test-status `register.ts:21` | `./gradlew test` nunca casa (`` antes de `.`) — mesmo padrão do #11 | pendente (G6) |
| 25 | test-skip-guard `register.ts:14` | `.skip(`/`.only(` bloqueados fora de arquivo de teste (falso positivo em `query.skip(10)`) | pendente (G6) |
| 26 | remote-context `register.ts:7` | `git -C . fetch` / `git -c k=v remote add` não invalidam o cache | pendente (G6) |
| 27 | queue-status `register.ts:47` | `session.start` zera contador mas não limpa a entrada do status — menor | pendente (G6) |

Não é bug (só observação): test-status fica em "tests …" após comando negado; expo-status e session-clock ignoram `cockpit.off` (talvez intencional) (G6); turn-timer guarda `tools` em `let` dentro de `register` (G8); read-only-status, pr-status, idle-clock idem (G8); ci-status, reset-countdown e cost-trend não repõem a entrada ao religar pelo hub até o próximo poll.

## Para retomar
1. Ler os relatórios de pausa dos agentes e conferir se as correções de debugger-guard, priciest-turn, uuid e agent-straggler passam em `node scripts/mod.mjs <mod>`.
2. Commit por bug (`fix(<mod>): ...`) com o hooks + o arquivo de teste do mod.
3. Concluir os 4 mods pendentes e receber os relatórios dos grupos 1–8; corrigir os bugs novos.
4. Commit dos testes restantes, `npm run check`, `git push -u origin fix/test-sweep`.

## Notas da API de teste (dos agentes)
- O `$` do teste não tem `state`; para testar `state.set` do hub use um plugin inline `{ name: 'cockpit', register }` em `test(name, { plugins: [HUB] }, ...)`.
- Para cair no `.catch` de um guard: `on('state.get', { plugin: 'cockpit', key: 'lang' }, () => ({ deny: 'x' }))`. Hook de teste que lança erro é ignorado.
- `mock.clock(on)` duas vezes no mesmo teste quebra; registrar o mesmo evento duas vezes sem matcher quebra o carregamento.
- `mods/clock-status/tests` usa `$.state.set`: conferir o tsc.
