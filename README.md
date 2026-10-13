# Turbina

**80 mods para turbinar o Claude Code no terminal.** 40 painéis que ficam sempre à vista e você liga ou desliga em `/turbina`, mais guards de segurança, automações de prompt, comandos e foco. Cada mod é um plugin pequeno, instalável com uma linha.

```
/plugin marketplace add MatheusChiodi/turbina
/plugin install git-band@turbina
/turbina
```

## Painéis e o painel de configuração

Os 40 mods da categoria **Sempre visível** são painéis: faixas acima do prompt ou entradas na status line que se atualizam sozinhas (git, contexto, custo, testes, CI, tarefas, prazo, clima...). Nenhum precisa de comando para aparecer.

O mod `turbina` é o painel de configuração deles e vem junto como dependência de qualquer painel:

| Ação | Como |
| --- | --- |
| Abrir o painel | `/turbina` — Tab/setas navegam, Enter ou clique alterna, Esc fecha |
| Desligar um painel | `/turbina off git-band` |
| Ligar um painel | `/turbina on git-band` |
| Tudo de uma vez | `/turbina off all` · `/turbina on all` |

A escolha fica salva entre sessões. Uma faixa some ou volta na hora; uma entrada de status line some na hora e volta na próxima atualização dela. Painel desligado continua instalado, só não desenha.

As faixas se empilham na ordem em que os mods carregam, e a status line guarda uma entrada por mod. Com muitos painéis ligados o terminal fica cheio: comece com 4 ou 5 e ajuste em `/turbina`.

> Mods são funções TypeScript que rodam dentro do Claude Code e mudam como ele se comporta: interceptam tool calls, reescrevem prompts, desenham painéis e faixas, registram slash commands. Exigem Claude Code **2.1.287+** (testado na 2.1.296).

## Instalação

**Pelo GitHub** (dentro do Claude Code):

```
/plugin marketplace add MatheusChiodi/turbina
/plugin install <mod>@turbina
```

**Por pasta local** (clone o repositório):

```bash
git clone https://github.com/MatheusChiodi/turbina
claude plugin marketplace add ./turbina
claude plugin install git-guard@turbina
```

**Só experimentar**, sem instalar:

```bash
claude --plugin-dir ./turbina/mods/turn-timer
```

Remover: `/plugin uninstall <mod>@turbina`. Desligar tudo de uma vez: `claude --safe-mode`.

## Catálogo

<!-- catalogo:inicio (gerado por scripts/build-docs.mjs, não edite à mão) -->
| Categoria | Mods |
| --- | --- |
| **Sempre visível** | [`turbina`](#turbina) · [`git-band`](#git-band) · [`todo-band`](#todo-band) · [`usage-band`](#usage-band) · [`files-band`](#files-band) · [`error-band`](#error-band) · [`goal-band`](#goal-band) · [`agents-band`](#agents-band) · [`activity-status`](#activity-status) · [`test-status`](#test-status) · [`ci-status`](#ci-status) · [`stash-status`](#stash-status) · [`uncommitted-band`](#uncommitted-band) · [`pr-status`](#pr-status) · [`main-warning-band`](#main-warning-band) · [`conflict-band`](#conflict-band) · [`project-status`](#project-status) · [`ports-band`](#ports-band) · [`deps-status`](#deps-status) · [`todo-count-status`](#todo-count-status) · [`quality-status`](#quality-status) · [`model-status`](#model-status) · [`cost-ticker`](#cost-ticker) · [`idle-clock`](#idle-clock) · [`turn-progress`](#turn-progress) · [`last-prompt-band`](#last-prompt-band) · [`compact-nudge`](#compact-nudge) · [`session-diff-band`](#session-diff-band) · [`shield-band`](#shield-band) · [`reset-countdown`](#reset-countdown) · [`spend-today`](#spend-today) · [`focus-band`](#focus-band) · [`deadline-band`](#deadline-band) · [`pin-band`](#pin-band) · [`clock-status`](#clock-status) · [`day-timer`](#day-timer) · [`commits-today`](#commits-today) · [`dolar-status`](#dolar-status) · [`weather-status`](#weather-status) · [`api-status`](#api-status) · [`terminal-pet`](#terminal-pet) |
| **Segurança** | [`rm-guard`](#rm-guard) · [`env-guard`](#env-guard) · [`git-guard`](#git-guard) · [`secret-scan`](#secret-scan) · [`prompt-secret-guard`](#prompt-secret-guard) · [`lockfile-guard`](#lockfile-guard) · [`path-jail`](#path-jail) · [`main-branch-guard`](#main-branch-guard) · [`generated-guard`](#generated-guard) · [`sql-guard`](#sql-guard) · [`prod-guard`](#prod-guard) · [`install-ask`](#install-ask) · [`pipe-shell-guard`](#pipe-shell-guard) · [`big-read-guard`](#big-read-guard) |
| **Interface** | [`turn-timer`](#turn-timer) · [`tool-tally`](#tool-tally) · [`file-trail`](#file-trail) · [`cmd-log`](#cmd-log) · [`git-status-line`](#git-status-line) · [`context-meter`](#context-meter) · [`rate-limit-watch`](#rate-limit-watch) · [`session-clock`](#session-clock) |
| **Prompt e modelo** | [`pt-br`](#pt-br) · [`concise-mode`](#concise-mode) · [`persona`](#persona) · [`prompt-shortcuts`](#prompt-shortcuts) · [`tldr`](#tldr) · [`git-context`](#git-context) · [`stack-context`](#stack-context) · [`commit-style`](#commit-style) |
| **Comandos** | [`quick-notes`](#quick-notes) · [`pomodoro`](#pomodoro) · [`copy-last`](#copy-last) · [`session-stats`](#session-stats) · [`quote-selection`](#quote-selection) · [`git-peek`](#git-peek) |
| **Foco e notificações** | [`turn-notify`](#turn-notify) · [`break-reminder`](#break-reminder) · [`daily-streak`](#daily-streak) |

## Sempre visível (41)

### `turbina`

Painel de configuração: /turbina liga e desliga cada painel da Turbina.

```
/plugin install turbina@turbina
```

![Prévia do turbina](docs/previews/turbina.svg)

### `git-band`

Faixa fixa com branch, arquivos alterados, +/- linhas, ahead/behind e último commit.

```
/plugin install git-band@turbina
```

![Prévia do git-band](docs/previews/git-band.svg)

### `todo-band`

Lista de tarefas do projeto fixa acima do prompt, clicável e persistente (/todo).

```
/plugin install todo-band@turbina
```

![Prévia do todo-band](docs/previews/todo-band.svg)

### `usage-band`

Faixa fixa com barras coloridas de contexto, janelas de 5h e 7 dias e custo.

```
/plugin install usage-band@turbina
```

![Prévia do usage-band](docs/previews/usage-band.svg)

### `files-band`

Faixa fixa com os arquivos que o Claude alterou nesta sessão.

```
/plugin install files-band@turbina
```

![Prévia do files-band](docs/previews/files-band.svg)

### `error-band`

Mantém à vista o último comando que falhou e a linha do erro, até um comando passar.

```
/plugin install error-band@turbina
```

![Prévia do error-band](docs/previews/error-band.svg)

### `goal-band`

/goal fixa o objetivo do projeto acima do prompt e no contexto do Claude.

```
/plugin install goal-band@turbina
```

![Prévia do goal-band](docs/previews/goal-band.svg)

### `agents-band`

Faixa que mostra em tempo real quantos subagentes estão rodando e quais.

```
/plugin install agents-band@turbina
```

![Prévia do agents-band](docs/previews/agents-band.svg)

### `activity-status`

Status line ao vivo com a ferramenta que o Claude está executando agora.

```
/plugin install activity-status@turbina
```

![Prévia do activity-status](docs/previews/activity-status.svg)

### `test-status`

Status line com o resultado da última execução de testes: passou ou falhou, hora e duração.

```
/plugin install test-status@turbina
```

![Prévia do test-status](docs/previews/test-status.svg)

### `ci-status`

Status line com o estado do último workflow do GitHub Actions (via gh).

```
/plugin install ci-status@turbina
```

![Prévia do ci-status](docs/previews/ci-status.svg)

### `stash-status`

Status line que lembra quantos stashes estão guardados.

```
/plugin install stash-status@turbina
```

![Prévia do stash-status](docs/previews/stash-status.svg)

### `uncommitted-band`

Faixa de aviso quando há alterações sem commit há mais de 45 minutos.

```
/plugin install uncommitted-band@turbina
```

![Prévia do uncommitted-band](docs/previews/uncommitted-band.svg)

### `pr-status`

Status line com o pull request da branch atual e o estado do review (via gh).

```
/plugin install pr-status@turbina
```

![Prévia do pr-status](docs/previews/pr-status.svg)

### `main-warning-band`

Faixa vermelha enquanto você estiver na main/master.

```
/plugin install main-warning-band@turbina
```

![Prévia do main-warning-band](docs/previews/main-warning-band.svg)

### `conflict-band`

Faixa que avisa de merge/rebase em andamento e arquivos em conflito.

```
/plugin install conflict-band@turbina
```

![Prévia do conflict-band](docs/previews/conflict-band.svg)

### `project-status`

Status line com nome e versão do projeto, versão do Node e gerenciador de pacotes.

```
/plugin install project-status@turbina
```

![Prévia do project-status](docs/previews/project-status.svg)

### `ports-band`

Faixa com os servidores de dev que estão no ar em localhost.

```
/plugin install ports-band@turbina
```

![Prévia do ports-band](docs/previews/ports-band.svg)

### `deps-status`

Status line com quantas dependências npm estão desatualizadas.

```
/plugin install deps-status@turbina
```

![Prévia do deps-status](docs/previews/deps-status.svg)

### `todo-count-status`

Status line com a contagem de TODO, FIXME e HACK no código versionado.

```
/plugin install todo-count-status@turbina
```

![Prévia do todo-count-status](docs/previews/todo-count-status.svg)

### `quality-status`

Status line com o último resultado de lint, tipos e build.

```
/plugin install quality-status@turbina
```

![Prévia do quality-status](docs/previews/quality-status.svg)

### `model-status`

Status line com o modelo em uso na sessão.

```
/plugin install model-status@turbina
```

![Prévia do model-status](docs/previews/model-status.svg)

### `cost-ticker`

Status line com o custo do último turno e o total da sessão.

```
/plugin install cost-ticker@turbina
```

![Prévia do cost-ticker](docs/previews/cost-ticker.svg)

### `idle-clock`

Status line com há quanto tempo a sessão está parada.

```
/plugin install idle-clock@turbina
```

![Prévia do idle-clock](docs/previews/idle-clock.svg)

### `turn-progress`

Status line ao vivo com tempo decorrido e tools do turno em andamento.

```
/plugin install turn-progress@turbina
```

![Prévia do turn-progress](docs/previews/turn-progress.svg)

### `last-prompt-band`

Faixa com o seu último pedido, para não se perder depois de respostas longas.

```
/plugin install last-prompt-band@turbina
```

![Prévia do last-prompt-band](docs/previews/last-prompt-band.svg)

### `compact-nudge`

Faixa com botão de compactar quando o contexto passa de 75%.

```
/plugin install compact-nudge@turbina
```

![Prévia do compact-nudge](docs/previews/compact-nudge.svg)

### `session-diff-band`

Faixa com o total de linhas que o Claude escreveu e removeu na sessão.

```
/plugin install session-diff-band@turbina
```

![Prévia do session-diff-band](docs/previews/session-diff-band.svg)

### `shield-band`

Faixa com a contagem de chamadas bloqueadas pelos guards e o último motivo.

```
/plugin install shield-band@turbina
```

![Prévia do shield-band](docs/previews/shield-band.svg)

### `reset-countdown`

Status line com a contagem regressiva até o reset do rate limit mais apertado.

```
/plugin install reset-countdown@turbina
```

![Prévia do reset-countdown](docs/previews/reset-countdown.svg)

### `spend-today`

Status line com o gasto do dia somando todas as sessões.

```
/plugin install spend-today@turbina
```

![Prévia do spend-today](docs/previews/spend-today.svg)

### `focus-band`

/focus inicia um bloco de foco com barra de progresso fixa.

```
/plugin install focus-band@turbina
```

![Prévia do focus-band](docs/previews/focus-band.svg)

### `deadline-band`

/deadline fixa uma contagem regressiva para o prazo do projeto.

```
/plugin install deadline-band@turbina
```

![Prévia do deadline-band](docs/previews/deadline-band.svg)

### `pin-band`

/pin fixa até 4 lembretes do projeto acima do prompt.

```
/plugin install pin-band@turbina
```

![Prévia do pin-band](docs/previews/pin-band.svg)

### `clock-status`

Status line com dia e hora (útil no modo fullscreen).

```
/plugin install clock-status@turbina
```

![Prévia do clock-status](docs/previews/clock-status.svg)

### `day-timer`

Status line com o tempo ativo de Claude Code no dia, somando as sessões.

```
/plugin install day-timer@turbina
```

![Prévia do day-timer](docs/previews/day-timer.svg)

### `commits-today`

Status line com quantos commits você fez hoje neste repositório.

```
/plugin install commits-today@turbina
```

![Prévia do commits-today](docs/previews/commits-today.svg)

### `dolar-status`

Status line com a cotação do dólar em reais (AwesomeAPI).

```
/plugin install dolar-status@turbina
```

![Prévia do dolar-status](docs/previews/dolar-status.svg)

### `weather-status`

Status line com o clima da sua cidade (wttr.in).

```
/plugin install weather-status@turbina
```

![Prévia do weather-status](docs/previews/weather-status.svg)

### `api-status`

Status line com o estado da API da Anthropic pela página pública de status.

```
/plugin install api-status@turbina
```

![Prévia do api-status](docs/previews/api-status.svg)

### `terminal-pet`

Mascote acima do prompt que reage: trabalhando, feliz, triste ou com sono.

```
/plugin install terminal-pet@turbina
```

![Prévia do terminal-pet](docs/previews/terminal-pet.svg)

## Segurança (14)

### `rm-guard`

Bloqueia rm -rf / Remove-Item -Recurse em raiz, home e drives, além de mkfs, dd e format.

```
/plugin install rm-guard@turbina
```

![Prévia do rm-guard](docs/previews/rm-guard.svg)

### `env-guard`

Protege arquivos .env contra leitura e escrita (Read, Edit, Write, cat e @menção).

```
/plugin install env-guard@turbina
```

![Prévia do env-guard](docs/previews/env-guard.svg)

### `git-guard`

Bloqueia git destrutivo: push --force, reset --hard, clean -f, --no-verify, branch -D.

```
/plugin install git-guard@turbina
```

![Prévia do git-guard](docs/previews/git-guard.svg)

### `secret-scan`

Recusa Write/Edit cujo conteúdo traz chaves de API, tokens ou chaves privadas.

```
/plugin install secret-scan@turbina
```

![Prévia do secret-scan](docs/previews/secret-scan.svg)

### `prompt-secret-guard`

Barra o envio de prompts que contenham segredos colados por engano.

```
/plugin install prompt-secret-guard@turbina
```

![Prévia do prompt-secret-guard](docs/previews/prompt-secret-guard.svg)

### `lockfile-guard`

Impede edição manual de lockfiles (package-lock, yarn.lock, pnpm-lock, Cargo.lock...).

```
/plugin install lockfile-guard@turbina
```

![Prévia do lockfile-guard](docs/previews/lockfile-guard.svg)

### `path-jail`

Restringe Write/Edit à raiz do projeto, ao temp e a ~/.claude (resolve symlinks).

```
/plugin install path-jail@turbina
```

![Prévia do path-jail](docs/previews/path-jail.svg)

### `main-branch-guard`

Recusa commit, push, merge e rebase quando a branch atual é main/master.

```
/plugin install main-branch-guard@turbina
```

![Prévia do main-branch-guard](docs/previews/main-branch-guard.svg)

### `generated-guard`

Impede edição em node_modules, dist, build, .next, coverage, .git e afins.

```
/plugin install generated-guard@turbina
```

![Prévia do generated-guard](docs/previews/generated-guard.svg)

### `sql-guard`

Bloqueia DROP, TRUNCATE e DELETE/UPDATE sem WHERE em comandos de shell.

```
/plugin install sql-guard@turbina
```

![Prévia do sql-guard](docs/previews/sql-guard.svg)

### `prod-guard`

Exige sua confirmação para deploy, publish, terraform apply, kubectl e migrações.

```
/plugin install prod-guard@turbina
```

![Prévia do prod-guard](docs/previews/prod-guard.svg)

### `install-ask`

Exige sua confirmação sempre que o Claude for instalar uma dependência nova.

```
/plugin install install-ask@turbina
```

![Prévia do install-ask](docs/previews/install-ask.svg)

### `pipe-shell-guard`

Bloqueia curl | sh, wget | bash, iwr | iex e variantes.

```
/plugin install pipe-shell-guard@turbina
```

![Prévia do pipe-shell-guard](docs/previews/pipe-shell-guard.svg)

### `big-read-guard`

Recusa ler inteiro um arquivo com mais de 512 KB e pede um recorte.

```
/plugin install big-read-guard@turbina
```

![Prévia do big-read-guard](docs/previews/big-read-guard.svg)

## Interface (8)

### `turn-timer`

Faixa acima do prompt com duração, tools e tokens do último turno.

```
/plugin install turn-timer@turbina
```

![Prévia do turn-timer](docs/previews/turn-timer.svg)

### `tool-tally`

/tally abre um painel com a contagem de chamadas por ferramenta.

```
/plugin install tool-tally@turbina
```

![Prévia do tool-tally](docs/previews/tool-tally.svg)

### `file-trail`

/trail abre um painel com os arquivos lidos e alterados na sessão.

```
/plugin install file-trail@turbina
```

![Prévia do file-trail](docs/previews/file-trail.svg)

### `cmd-log`

/cmdlog abre um painel com os comandos de shell, status e duração.

```
/plugin install cmd-log@turbina
```

![Prévia do cmd-log](docs/previews/cmd-log.svg)

### `git-status-line`

Status line com branch, arquivos alterados e commits à frente/atrás.

```
/plugin install git-status-line@turbina
```

![Prévia do git-status-line](docs/previews/git-status-line.svg)

### `context-meter`

Status line com barra de contexto e custo; avisa em 80% e 90%.

```
/plugin install context-meter@turbina
```

![Prévia do context-meter](docs/previews/context-meter.svg)

### `rate-limit-watch`

Toast quando a janela de 5h ou 7 dias passa de 75/90/95%; /limits lista o uso.

```
/plugin install rate-limit-watch@turbina
```

![Prévia do rate-limit-watch](docs/previews/rate-limit-watch.svg)

### `session-clock`

Status line com tempo de sessão e número de prompts.

```
/plugin install session-clock@turbina
```

![Prévia do session-clock](docs/previews/session-clock.svg)

## Prompt e modelo (8)

### `pt-br`

Faz o Claude responder sempre em português do Brasil (seção no system prompt).

```
/plugin install pt-br@turbina
```

![Prévia do pt-br](docs/previews/pt-br.svg)

### `concise-mode`

/concise liga respostas curtas e diretas, sem introdução nem recapitulação.

```
/plugin install concise-mode@turbina
```

![Prévia do concise-mode](docs/previews/concise-mode.svg)

### `persona`

/persona troca a voz do Claude: mentor, senior, rubberduck, pirata, yoda, zen.

```
/plugin install persona@turbina
```

![Prévia do persona](docs/previews/persona.svg)

### `prompt-shortcuts`

Atalhos ::fix, ::test, ::review, ::explain, ::refactor, ::doc, ::commit viram prompts completos.

```
/plugin install prompt-shortcuts@turbina
```

![Prévia do prompt-shortcuts](docs/previews/prompt-shortcuts.svg)

### `tldr`

Acrescenta um TL;DR de 2 frases (via haiku) abaixo de respostas longas.

```
/plugin install tldr@turbina
```

![Prévia do tldr](docs/previews/tldr.svg)

### `git-context`

Anexa o estado do git (branch e arquivos alterados) a cada prompt, como contexto oculto.

```
/plugin install git-context@turbina
```

![Prévia do git-context](docs/previews/git-context.svg)

### `stack-context`

Detecta a stack do projeto (package.json, pom.xml...) e informa o Claude no system prompt.

```
/plugin install stack-context@turbina
```

![Prévia do stack-context](docs/previews/stack-context.svg)

### `commit-style`

Faz o Claude escrever commits em Conventional Commits, curtos e no imperativo.

```
/plugin install commit-style@turbina
```

![Prévia do commit-style](docs/previews/commit-style.svg)

## Comandos (6)

### `quick-notes`

/note e /notes: notas rápidas por projeto, persistentes entre sessões.

```
/plugin install quick-notes@turbina
```

![Prévia do quick-notes](docs/previews/quick-notes.svg)

### `pomodoro`

/pomodoro [min] com contagem na status line, toast e notificação ao final.

```
/plugin install pomodoro@turbina
```

![Prévia do pomodoro](docs/previews/pomodoro.svg)

### `copy-last`

/copy-last copia a última resposta; /copy-code copia o último bloco de código.

```
/plugin install copy-last@turbina
```

![Prévia do copy-last](docs/previews/copy-last.svg)

### `session-stats`

/stats resume a sessão: tempo, prompts, tools, tokens, contexto e custo.

```
/plugin install session-stats@turbina
```

![Prévia do session-stats](docs/previews/session-stats.svg)

### `quote-selection`

/quote cita no prompt o trecho selecionado com o mouse.

```
/plugin install quote-selection@turbina
```

![Prévia do quote-selection](docs/previews/quote-selection.svg)

### `git-peek`

/gs, /gl e /gd: status, log e diff do git na hora, sem gastar turno do modelo.

```
/plugin install git-peek@turbina
```

![Prévia do git-peek](docs/previews/git-peek.svg)

## Foco e notificações (3)

### `turn-notify`

Notificação nativa quando um turno de 30s ou mais termina.

```
/plugin install turn-notify@turbina
```

![Prévia do turn-notify](docs/previews/turn-notify.svg)

### `break-reminder`

Toast a cada 50 minutos de sessão lembrando de fazer uma pausa.

```
/plugin install break-reminder@turbina
```

![Prévia do break-reminder](docs/previews/break-reminder.svg)

### `daily-streak`

Conta seus dias seguidos de Claude Code; toast ao abrir e comando /streak.

```
/plugin install daily-streak@turbina
```

![Prévia do daily-streak](docs/previews/daily-streak.svg)
<!-- catalogo:fim -->

## Combos sugeridos

| Objetivo | Mods |
| --- | --- |
| **Painel de bordo do dia a dia** | `git-band` `usage-band` `todo-band` `error-band` `test-status` |
| **Git sem surpresa** | `git-band` `conflict-band` `uncommitted-band` `main-warning-band` `pr-status` `ci-status` |
| **De olho no gasto** | `usage-band` `cost-ticker` `spend-today` `reset-countdown` `compact-nudge` |
| **Cinto de segurança** | `rm-guard` `git-guard` `env-guard` `secret-scan` `pipe-shell-guard` `prod-guard` `shield-band` |
| **Vibe coder BR** | `pt-br` `concise-mode` `stack-context` `git-context` `commit-style` |
| **Foco** | `focus-band` `deadline-band` `pin-band` `turn-notify` `break-reminder` |

## O que saber antes de instalar

- **Mods não são sandboxed.** Rodam com o mesmo alcance do Claude Code. Leia o `hooks/register.ts` do mod antes de instalar — todos aqui são curtos.
- **Os guards são cinto de segurança, não cofre.** Casam padrões conhecidos de comandos e caminhos; um comando ofuscado pode passar, e um caminho legítimo pode ser barrado. Mantenha as permissões do Claude Code configuradas.
- **`prod-guard` e `install-ask` não bloqueiam:** forçam o pedido de confirmação, mesmo quando o comando já estava liberado.
- **`tldr` gasta tokens:** faz uma chamada curta ao haiku por resposta longa.
- **`main-branch-guard` e `path-jail` são restritivos de propósito.** Instale só se o fluxo combinar com o seu. `main-warning-band` é a versão que só avisa.
- **Painéis que usam rede:** `dolar-status` (AwesomeAPI), `weather-status` (wttr.in, localiza por IP), `api-status` (página de status da Anthropic) e `ports-band` (só `localhost`). Sem resposta, ficam ocultos.
- **Painéis que precisam do `gh` autenticado:** `ci-status` e `pr-status`.
- **Painéis que rodam `git` periodicamente:** os do grupo Git consultam o repositório a cada 30–60 s.
- **Sem som.** `$.audio.play` só toca no macOS nesta versão; por isso `turn-notify`, `pomodoro` e `focus-band` usam a notificação nativa.
- A API de mods é **early access** e pode mudar entre versões do Claude Code.

## Desenvolvimento

```bash
npm install
npm run build      # gera plugin.json, hooks.json, marketplace.json, prévias SVG e o catálogo deste README
npm run check      # tsc + claude plugin validate em cada mod + claude plugin test onde há testes
```

Estrutura de um mod:

```
mods/<nome>/
  .claude-plugin/plugin.json   # gerado a partir de mods.json
  hooks/hooks.json             # gerado: { "modules": ["./register.ts"] }
  hooks/register.ts(x)         # o mod
  types/index.d.ts             # contrato de $.state (só nos mods com painel/faixa)
  tests/<nome>.test.ts         # roda com `claude plugin test`
```

`mods.json` é a fonte única: nome, categoria, descrição e as linhas da prévia de cada mod.

O type-check usa as declarações da API que o próprio Claude Code escreve. Elas não vão no repositório: rode um mod com `claude --plugin-dir mods/<nome>` e copie `mods/<nome>/.claude-plugin/types/claude-code/index.d.ts` (mais `claude-code-tools/index.d.ts`) para `engine-types/`.

Um mod novo de painel entra em `mods.json` com `"category": "painel"`; `node scripts/add-toggle.mjs` liga ele ao `/turbina` e o build regenera a lista que o painel de configuração desenha (`mods/turbina/hooks/panels.ts`).

**Cobertura de testes:** 12 mods têm testes automatizados — `turbina`, `rm-guard`, `env-guard`, `git-guard`, `secret-scan`, `prompt-secret-guard`, `lockfile-guard`, `main-branch-guard`, `generated-guard`, `sql-guard`, `pipe-shell-guard` e `prompt-shortcuts`. Os outros 68 passam em `tsc` e `claude plugin validate`, mas não têm teste automatizado.

## Pesquisa: o ecossistema de mods

Levantamento feito em 13/10/2026 via `gh api` e documentação oficial. Estrelas são do momento da consulta.

**Oficial**

- Anúncio: [claude.com/blog/claude-code-mods](https://claude.com/blog/claude-code-mods) (01/10/2026)
- Documentação: [code.claude.com/docs/en/plugins/mods/overview](https://code.claude.com/docs/en/plugins/mods/overview)
- Mods embutidos: [anthropics/claude-code/mods](https://github.com/anthropics/claude-code/tree/main/mods)
- Exemplos: [anthropics/claude-code-playground](https://github.com/anthropics/claude-code-playground/tree/main/claude-code/mods)

**Coleções da comunidade**

| Repositório | Estrelas | Destaques |
| --- | --- | --- |
| [karanb192/awesome-claude-code-mods](https://github.com/karanb192/awesome-claude-code-mods) | 560 | Catálogo: 3.836 mods em 1.987 repositórios |
| [YeonwooSung/my-claude-code-mods](https://github.com/YeonwooSung/my-claude-code-mods) | 514 | agent-profiler, context-inspector, time-machine |
| [hamzafer/claude-code-mods](https://github.com/hamzafer/claude-code-mods) | 227 | context-bar, blast-radius, merge-gate, snake |
| [whyashthakker/awesome-claude-code-mods](https://github.com/whyashthakker/awesome-claude-code-mods) | 59 | 100+ mods pequenos |
| [ray-amjad/claude-code-mods](https://github.com/ray-amjad/claude-code-mods) | 46 | cache-clock, prompt-bouncer, secret-box |
| [zenbu-labs/terminal-browser](https://github.com/zenbu-labs/terminal-browser) | 3.854 | Navegador dentro do terminal |
| [jarrodwatts/claude-image-view](https://github.com/jarrodwatts/claude-image-view) | 222 | Imagens no terminal |

**Customização que não é mod** (outros mecanismos)

| Projeto | Estrelas | Mecanismo |
| --- | --- | --- |
| [jarrodwatts/claude-hud](https://github.com/jarrodwatts/claude-hud) | 28.495 | Plugin de statusline/HUD |
| [ccusage/ccusage](https://github.com/ccusage/ccusage) | 19.001 | CLI que lê os transcripts JSONL |
| [sirmalloc/ccstatusline](https://github.com/sirmalloc/ccstatusline) | 13.274 | Script de statusline |
| [PeonPing/peon-ping](https://github.com/PeonPing/peon-ping) | 5.074 | Hooks shell de som |
| [Piebald-AI/tweakcc](https://github.com/Piebald-AI/tweakcc) | 2.544 | Patch da instalação |
| [kenryu42/cc-safety-net](https://github.com/kenryu42/cc-safety-net) | 1.615 | Guard via hook PreToolUse |

**O que a pesquisa mostrou de possibilidades:** faixas e painéis vivos, guards de tool call e de prompt, slash commands instantâneos, seções no system prompt, tools e subagentes registrados pelo mod, timers, chamadas ao modelo, HTTP e processos no host. O espaço de barras de contexto/uso já está saturado; a Turbina aposta em guards em português, comandos sem custo de turno e foco.

## Licença

MIT
