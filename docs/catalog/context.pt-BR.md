# Contexto e custo — 5 mods

[← Voltar ao README](../../README.pt-BR.md)

[`reread-guard`](#reread-guard) · [`grep-limit`](#grep-limit) · [`read-cap`](#read-cap) · [`git-log-limit`](#git-log-limit) · [`paste-size-toast`](#paste-size-toast)

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
