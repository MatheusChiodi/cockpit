# Git e GitHub — 6 mods

[← Voltar ao README](../../README.pt-BR.md)

[`commit-review`](#commit-review) · [`wip-commit-guard`](#wip-commit-guard) · [`marker-guard`](#marker-guard) · [`amend-guard`](#amend-guard) · [`stage-guard`](#stage-guard) · [`git-stage`](#git-stage)

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

## `amend-guard`

Pergunta antes de git commit --amend ou git rebase reescreverem commits que já estão numa branch remota.

```
/plugin install amend-guard@cockpit
```

![amend-guard](../previews/amend-guard.svg)

## `stage-guard`

Recusa git add -A, git add . e git commit -a enquanto um .env, chave ou certificado espera para entrar no stage.

```
/plugin install stage-guard@cockpit
```

![stage-guard](../previews/stage-guard.svg)

## `git-stage`

/stage lista o que está no stage, fora dele e novo; /stage <caminhos> adiciona e -r tira, perguntando antes.

```
/plugin install git-stage@cockpit
```

![git-stage](../previews/git-stage.svg)
