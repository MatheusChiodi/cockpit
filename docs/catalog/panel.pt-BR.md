# Sempre visível — 50 mods

[← Voltar ao README](../../README.pt-BR.md)

[`cockpit`](#cockpit) · [`git-band`](#git-band) · [`todo-band`](#todo-band) · [`usage-band`](#usage-band) · [`files-band`](#files-band) · [`error-band`](#error-band) · [`goal-band`](#goal-band) · [`agents-band`](#agents-band) · [`activity-status`](#activity-status) · [`test-status`](#test-status) · [`ci-status`](#ci-status) · [`stash-status`](#stash-status) · [`uncommitted-band`](#uncommitted-band) · [`pr-status`](#pr-status) · [`main-warning-band`](#main-warning-band) · [`conflict-band`](#conflict-band) · [`project-status`](#project-status) · [`ports-band`](#ports-band) · [`deps-status`](#deps-status) · [`todo-count-status`](#todo-count-status) · [`quality-status`](#quality-status) · [`model-status`](#model-status) · [`cost-ticker`](#cost-ticker) · [`idle-clock`](#idle-clock) · [`turn-progress`](#turn-progress) · [`last-prompt-band`](#last-prompt-band) · [`compact-nudge`](#compact-nudge) · [`session-diff-band`](#session-diff-band) · [`shield-band`](#shield-band) · [`reset-countdown`](#reset-countdown) · [`spend-today`](#spend-today) · [`focus-band`](#focus-band) · [`deadline-band`](#deadline-band) · [`pin-band`](#pin-band) · [`clock-status`](#clock-status) · [`day-timer`](#day-timer) · [`commits-today`](#commits-today) · [`dolar-status`](#dolar-status) · [`weather-status`](#weather-status) · [`api-status`](#api-status) · [`terminal-pet`](#terminal-pet) · [`runtime-band`](#runtime-band) · [`docker-band`](#docker-band) · [`env-drift-band`](#env-drift-band) · [`deploy-status`](#deploy-status) · [`todo-new-status`](#todo-new-status) · [`release-status`](#release-status) · [`license-status`](#license-status) · [`install-status`](#install-status) · [`db-port-status`](#db-port-status)

## `cockpit`

Painel de configurações: /cockpit liga e desliga cada painel e define o idioma de todos os mods.

```
/plugin install cockpit@cockpit
```

![cockpit](../previews/cockpit.svg)

## `git-band`

Faixa fixa com branch, arquivos alterados, linhas adicionadas e removidas, ahead/behind e último commit.

```
/plugin install git-band@cockpit
```

![git-band](../previews/git-band.svg)

## `todo-band`

Lista de tarefas do projeto fixa acima do prompt, clicável e persistente (/todo).

```
/plugin install todo-band@cockpit
```

![todo-band](../previews/todo-band.svg)

## `usage-band`

Faixa fixa com barras coloridas de contexto, janelas de 5h e 7 dias e custo.

```
/plugin install usage-band@cockpit
```

![usage-band](../previews/usage-band.svg)

## `files-band`

Faixa fixa com os arquivos que o Claude alterou nesta sessão.

```
/plugin install files-band@cockpit
```

![files-band](../previews/files-band.svg)

## `error-band`

Mantém à vista o último comando que falhou e a linha do erro, até um comando passar.

```
/plugin install error-band@cockpit
```

![error-band](../previews/error-band.svg)

## `goal-band`

/goal fixa o objetivo do projeto acima do prompt e no contexto do Claude.

```
/plugin install goal-band@cockpit
```

![goal-band](../previews/goal-band.svg)

## `agents-band`

Faixa que mostra em tempo real quantos subagentes estão rodando e quais.

```
/plugin install agents-band@cockpit
```

![agents-band](../previews/agents-band.svg)

## `activity-status`

Status line ao vivo com a ferramenta que o Claude está executando agora.

```
/plugin install activity-status@cockpit
```

![activity-status](../previews/activity-status.svg)

## `test-status`

Entrada na status line com o resultado da última execução de testes: passou ou falhou, hora e duração.

```
/plugin install test-status@cockpit
```

![test-status](../previews/test-status.svg)

## `ci-status`

Status line com o estado do último workflow do GitHub Actions (via gh).

```
/plugin install ci-status@cockpit
```

![ci-status](../previews/ci-status.svg)

## `stash-status`

Status line que lembra quantos stashes estão guardados.

```
/plugin install stash-status@cockpit
```

![stash-status](../previews/stash-status.svg)

## `uncommitted-band`

Faixa de aviso quando há alterações sem commit há mais de 45 minutos.

```
/plugin install uncommitted-band@cockpit
```

![uncommitted-band](../previews/uncommitted-band.svg)

## `pr-status`

Status line com o pull request da branch atual e o estado do review (via gh).

```
/plugin install pr-status@cockpit
```

![pr-status](../previews/pr-status.svg)

## `main-warning-band`

Faixa vermelha enquanto você estiver na main/master.

```
/plugin install main-warning-band@cockpit
```

![main-warning-band](../previews/main-warning-band.svg)

## `conflict-band`

Faixa que avisa de merge/rebase em andamento e arquivos em conflito.

```
/plugin install conflict-band@cockpit
```

![conflict-band](../previews/conflict-band.svg)

## `project-status`

Status line com nome e versão do projeto, versão do Node e gerenciador de pacotes.

```
/plugin install project-status@cockpit
```

![project-status](../previews/project-status.svg)

## `ports-band`

Faixa com os servidores de dev que estão no ar em localhost.

```
/plugin install ports-band@cockpit
```

![ports-band](../previews/ports-band.svg)

## `deps-status`

Status line com quantas dependências npm estão desatualizadas.

```
/plugin install deps-status@cockpit
```

![deps-status](../previews/deps-status.svg)

## `todo-count-status`

Status line com a contagem de TODO, FIXME e HACK no código versionado.

```
/plugin install todo-count-status@cockpit
```

![todo-count-status](../previews/todo-count-status.svg)

## `quality-status`

Status line com o último resultado de lint, tipos e build.

```
/plugin install quality-status@cockpit
```

![quality-status](../previews/quality-status.svg)

## `model-status`

Status line com o modelo em uso na sessão.

```
/plugin install model-status@cockpit
```

![model-status](../previews/model-status.svg)

## `cost-ticker`

Status line com o custo do último turno e o total da sessão.

```
/plugin install cost-ticker@cockpit
```

![cost-ticker](../previews/cost-ticker.svg)

## `idle-clock`

Status line com há quanto tempo a sessão está parada.

```
/plugin install idle-clock@cockpit
```

![idle-clock](../previews/idle-clock.svg)

## `turn-progress`

Status line ao vivo com tempo decorrido e tools do turno em andamento.

```
/plugin install turn-progress@cockpit
```

![turn-progress](../previews/turn-progress.svg)

## `last-prompt-band`

Faixa com o seu último pedido, para não se perder depois de respostas longas.

```
/plugin install last-prompt-band@cockpit
```

![last-prompt-band](../previews/last-prompt-band.svg)

## `compact-nudge`

Faixa com botão de compactar quando o contexto passa de 75%.

```
/plugin install compact-nudge@cockpit
```

![compact-nudge](../previews/compact-nudge.svg)

## `session-diff-band`

Faixa com o total de linhas que o Claude escreveu e removeu na sessão.

```
/plugin install session-diff-band@cockpit
```

![session-diff-band](../previews/session-diff-band.svg)

## `shield-band`

Faixa com a contagem de chamadas bloqueadas pelos guards e o último motivo.

```
/plugin install shield-band@cockpit
```

![shield-band](../previews/shield-band.svg)

## `reset-countdown`

Status line com a contagem regressiva até o reset do rate limit mais apertado.

```
/plugin install reset-countdown@cockpit
```

![reset-countdown](../previews/reset-countdown.svg)

## `spend-today`

Status line com o gasto do dia somando todas as sessões.

```
/plugin install spend-today@cockpit
```

![spend-today](../previews/spend-today.svg)

## `focus-band`

/focus inicia um bloco de foco com barra de progresso fixa.

```
/plugin install focus-band@cockpit
```

![focus-band](../previews/focus-band.svg)

## `deadline-band`

/deadline fixa uma contagem regressiva para o prazo do projeto.

```
/plugin install deadline-band@cockpit
```

![deadline-band](../previews/deadline-band.svg)

## `pin-band`

/pin fixa até 4 lembretes do projeto acima do prompt.

```
/plugin install pin-band@cockpit
```

![pin-band](../previews/pin-band.svg)

## `clock-status`

Status line com dia e hora (útil no modo fullscreen).

```
/plugin install clock-status@cockpit
```

![clock-status](../previews/clock-status.svg)

## `day-timer`

Status line com o tempo ativo de Claude Code no dia, somando as sessões.

```
/plugin install day-timer@cockpit
```

![day-timer](../previews/day-timer.svg)

## `commits-today`

Status line com quantos commits você fez hoje neste repositório.

```
/plugin install commits-today@cockpit
```

![commits-today](../previews/commits-today.svg)

## `dolar-status`

Status line com a cotação do dólar em reais (AwesomeAPI).

```
/plugin install dolar-status@cockpit
```

![dolar-status](../previews/dolar-status.svg)

## `weather-status`

Status line com o clima da sua cidade (wttr.in).

```
/plugin install weather-status@cockpit
```

![weather-status](../previews/weather-status.svg)

## `api-status`

Status line com o estado da API da Anthropic pela página pública de status.

```
/plugin install api-status@cockpit
```

![api-status](../previews/api-status.svg)

## `terminal-pet`

Mascote acima do prompt que reage: trabalhando, feliz, triste ou com sono.

```
/plugin install terminal-pet@cockpit
```

![terminal-pet](../previews/terminal-pet.svg)

## `runtime-band`

Faixa que aparece quando a versão de Node, Python ou Java que o projeto pede difere da instalada.

```
/plugin install runtime-band@cockpit
```

![runtime-band](../previews/runtime-band.svg)

## `docker-band`

Faixa que avisa quando o daemon do Docker está parado ou uma stack compose tem serviços parados.

```
/plugin install docker-band@cockpit
```

![docker-band](../previews/docker-band.svg)

## `env-drift-band`

Faixa com as chaves que o .env.example tem e o .env não, só os nomes, nunca os valores.

```
/plugin install env-drift-band@cockpit
```

![env-drift-band](../previews/env-drift-band.svg)

## `deploy-status`

Entrada na status line com o resultado do último comando de deploy: vercel, netlify, eas, firebase, fly e outros.

```
/plugin install deploy-status@cockpit
```

![deploy-status](../previews/deploy-status.svg)

## `todo-new-status`

Status line contando as linhas TODO, FIXME e HACK adicionadas ao código nesta sessão.

```
/plugin install todo-new-status@cockpit
```

![todo-new-status](../previews/todo-new-status.svg)

## `release-status`

Status line com a versão do pacote, a última tag e os commits que esperam o próximo release.

```
/plugin install release-status@cockpit
```

![release-status](../previews/release-status.svg)

## `license-status`

Status line que avisa quando o projeto não tem arquivo de licença nem campo license no package.json.

```
/plugin install license-status@cockpit
```

![license-status](../previews/license-status.svg)

## `install-status`

Status line que avisa quando o node_modules não existe ou está mais velho que o lockfile.

```
/plugin install install-status@cockpit
```

![install-status](../previews/install-status.svg)

## `db-port-status`

Status line que avisa quando o banco ou cache local para o qual o projeto aponta não está escutando.

```
/plugin install db-port-status@cockpit
```

![db-port-status](../previews/db-port-status.svg)
