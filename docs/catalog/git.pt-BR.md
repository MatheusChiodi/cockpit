# Git e GitHub — 19 mods

[← Voltar ao README](../../README.pt-BR.md)

[`commit-review`](#commit-review) · [`wip-commit-guard`](#wip-commit-guard) · [`marker-guard`](#marker-guard) · [`amend-guard`](#amend-guard) · [`stage-guard`](#stage-guard) · [`git-stage`](#git-stage) · [`git-fixup`](#git-fixup) · [`git-sync`](#git-sync) · [`behind-toast`](#behind-toast) · [`git-switch`](#git-switch) · [`git-tag`](#git-tag) · [`staged-status`](#staged-status) · [`pr-open`](#pr-open) · [`pr-checks`](#pr-checks) · [`pr-comments`](#pr-comments) · [`review-queue`](#review-queue) · [`issue-context`](#issue-context) · [`issue-link`](#issue-link) · [`draft-nag`](#draft-nag)

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

## `git-fixup`

/fixup commita o que está no stage como fixup do HEAD ou de qualquer commit, pronto para rebase --autosquash.

```
/plugin install git-fixup@cockpit
```

![git-fixup](../previews/git-fixup.svg)

## `git-sync`

/sync faz fetch e mostra a distância da branch para a base; /sync rebase ou merge traz a base depois de perguntar.

```
/plugin install git-sync@cockpit
```

![git-sync](../previews/git-sync.svg)

## `behind-toast`

Toast quando sua branch fica 10, 20, 30 commits atrás da base, antes que os conflitos se acumulem.

```
/plugin install behind-toast@cockpit
```

![behind-toast](../previews/behind-toast.svg)

## `git-switch`

/gsw troca de branch levando seu trabalho não commitado: guarda num stash, troca e oferece de volta quando você voltar.

```
/plugin install git-switch@cockpit
```

![git-switch](../previews/git-switch.svg)

## `git-tag`

/gtag mostra a última tag e os commits desde então; /gtag patch, minor ou major cria a tag da próxima versão depois de perguntar.

```
/plugin install git-tag@cockpit
```

![git-tag](../previews/git-tag.svg)

## `staged-status`

Status line com quantos arquivos estão no stage, fora dele e novos, escondida quando a árvore está limpa.

```
/plugin install staged-status@cockpit
```

![staged-status](../previews/staged-status.svg)

## `pr-open`

/prnew abre um pull request da branch atual com título e corpo montados a partir dos commits, depois de perguntar.

```
/plugin install pr-open@cockpit
```

![pr-open](../previews/pr-open.svg)

## `pr-checks`

/checks mostra os checks do pull request atual e quais falharam, com os links.

```
/plugin install pr-checks@cockpit
```

![pr-checks](../previews/pr-checks.svg)

## `pr-comments`

/prcomments lista os comentários de revisão do seu pull request que ainda não receberam resposta sua.

```
/plugin install pr-comments@cockpit
```

![pr-comments](../previews/pr-comments.svg)

## `review-queue`

Linha de status com quantos pull requests esperam a sua revisão, e um aviso quando chega um novo pedido.

```
/plugin install review-queue@cockpit
```

![review-queue](../previews/review-queue.svg)

## `issue-context`

Quando o prompt cita uma issue (issue #12 ou um link de issue), o título, os rótulos e o texto chegam ao Claude como contexto oculto.

```
/plugin install issue-context@cockpit
```

![issue-context](../previews/issue-context.svg)

## `issue-link`

/closes 12 adiciona "Closes #12" ao pull request atual para a issue fechar no merge, depois de perguntar.

```
/plugin install issue-link@cockpit
```

![issue-link](../previews/issue-link.svg)

## `draft-nag`

Aviso quando um dos seus pull requests está como rascunho há três dias sem atualização.

```
/plugin install draft-nag@cockpit
```

![draft-nag](../previews/draft-nag.svg)
