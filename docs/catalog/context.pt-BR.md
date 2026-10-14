# Contexto e custo — 12 mods

[← Voltar ao README](../../README.pt-BR.md)

[`reread-guard`](#reread-guard) · [`grep-limit`](#grep-limit) · [`read-cap`](#read-cap) · [`git-log-limit`](#git-log-limit) · [`paste-size-toast`](#paste-size-toast) · [`cat-guard`](#cat-guard) · [`explore-nudge`](#explore-nudge) · [`fill-toast`](#fill-toast) · [`cache-cold-toast`](#cache-cold-toast) · [`flood-note`](#flood-note) · [`heavy-calls`](#heavy-calls) · [`tree-flood-guard`](#tree-flood-guard)

## `reread-guard`

Recusa reler um arquivo que Claude já leu na sessão e que não mudou, uma vez, com o motivo.

```
/plugin install reread-guard@cockpit
```

![reread-guard](../previews/reread-guard.svg)

## `grep-limit`

Limita a 100 linhas um Grep que imprime as linhas encontradas e avisa Claude quando o limite cortou a resposta.

```
/plugin install grep-limit@cockpit
```

![grep-limit](../previews/grep-limit.svg)

## `read-cap`

Lê só as primeiras 600 linhas de um arquivo com mais de 150 KB e diz a Claude como continuar com offset.

```
/plugin install read-cap@cockpit
```

![read-cap](../previews/read-cap.svg)

## `git-log-limit`

Acrescenta -n 30 a um git log sem limite, para o histórico não inundar o contexto.

```
/plugin install git-log-limit@cockpit
```

![git-log-limit](../previews/git-log-limit.svg)

## `paste-size-toast`

Um toast quando o prompt enviado é muito grande, com o tamanho em linhas e tokens, para você enxugar um log colado.

```
/plugin install paste-size-toast@cockpit
```

![paste-size-toast](../previews/paste-size-toast.svg)

## `cat-guard`

Recusa cat, type e Get-Content em um arquivo com mais de 100 KB e aponta um trecho ou o Grep.

```
/plugin install cat-guard@cockpit
```

![cat-guard](../previews/cat-guard.svg)

## `explore-nudge`

Depois de 15 leituras e buscas em um turno, um toast e uma nota para Claude passar o resto da exploração a um subagente.

```
/plugin install explore-nudge@cockpit
```

![explore-nudge](../previews/explore-nudge.svg)

## `fill-toast`

Um toast quando a janela de contexto sobe 10 pontos ou mais de uma vez, com o nome da última ferramenta usada.

```
/plugin install fill-toast@cockpit
```

![fill-toast](../previews/fill-toast.svg)

## `cache-cold-toast`

Um toast quando você envia um prompt depois de a janela de 5 minutos do cache de prompt expirar com um contexto grande.

```
/plugin install cache-cold-toast@cockpit
```

![cache-cold-toast](../previews/cache-cold-toast.svg)

## `flood-note`

Avisa Claude quando uma busca ou comando devolveu mais de 300 linhas, para estreitar a próxima em vez de repetir.

```
/plugin install flood-note@cockpit
```

![flood-note](../previews/flood-note.svg)

## `heavy-calls`

/heavy lista os cinco resultados de ferramenta que mais gastaram contexto na sessão, com ferramenta, alvo e tamanho.

```
/plugin install heavy-calls@cockpit
```

![heavy-calls](../previews/heavy-calls.svg)

## `tree-flood-guard`

Recusa find, ls -R ou dir /s sem filtro que listaria node_modules, e sugere git ls-files ou Glob.

```
/plugin install tree-flood-guard@cockpit
```

![tree-flood-guard](../previews/tree-flood-guard.svg)
