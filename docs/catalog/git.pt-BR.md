# Git e GitHub — 3 mods

[← Voltar ao README](../../README.pt-BR.md)

[`commit-review`](#commit-review) · [`wip-commit-guard`](#wip-commit-guard) · [`marker-guard`](#marker-guard)

## `commit-review`

Pede que você olhe o diff antes de passar um commit grande, mostrando os arquivos e linhas no stage.

```
/plugin install commit-review@cockpit
```

![commit-review](../previews/commit-review.svg)

## `wip-commit-guard`

Recusa commits com mensagem wip, fix, asdf, um ponto ou parecida, para o histórico dizer o que mudou.

```
/plugin install wip-commit-guard@cockpit
```

![wip-commit-guard](../previews/wip-commit-guard.svg)

## `marker-guard`

Recusa um commit cujas mudanças no stage ainda têm marcadores de conflito, listando os arquivos.

```
/plugin install marker-guard@cockpit
```

![marker-guard](../previews/marker-guard.svg)
