# Git y GitHub — 18 mods

[← Volver al README](../../README.es.md)

[`commit-review`](#commit-review) · [`wip-commit-guard`](#wip-commit-guard) · [`marker-guard`](#marker-guard) · [`amend-guard`](#amend-guard) · [`stage-guard`](#stage-guard) · [`git-stage`](#git-stage) · [`git-fixup`](#git-fixup) · [`git-sync`](#git-sync) · [`behind-toast`](#behind-toast) · [`git-switch`](#git-switch) · [`git-tag`](#git-tag) · [`staged-status`](#staged-status) · [`pr-open`](#pr-open) · [`pr-checks`](#pr-checks) · [`pr-comments`](#pr-comments) · [`review-queue`](#review-queue) · [`issue-context`](#issue-context) · [`issue-link`](#issue-link)

## `commit-review`

Te pide mirar el diff antes de que pase un commit grande, mostrando los archivos y líneas en el stage.

```
/plugin install commit-review@cockpit
```

![commit-review](../previews/commit-review.svg)

## `wip-commit-guard`

Rechaza commits con mensaje wip, fix, asdf, un punto o similar, para que el historial diga qué cambió.

```
/plugin install wip-commit-guard@cockpit
```

![wip-commit-guard](../previews/wip-commit-guard.svg)

## `marker-guard`

Rechaza un commit cuyos cambios en el stage aún tienen marcadores de conflicto, listando los archivos.

```
/plugin install marker-guard@cockpit
```

![marker-guard](../previews/marker-guard.svg)

## `amend-guard`

Pregunta antes de que git commit --amend o git rebase reescriban commits que ya están en una rama remota.

```
/plugin install amend-guard@cockpit
```

![amend-guard](../previews/amend-guard.svg)

## `stage-guard`

Rechaza git add -A, git add . y git commit -a mientras un .env, llave o certificado espera entrar al stage.

```
/plugin install stage-guard@cockpit
```

![stage-guard](../previews/stage-guard.svg)

## `git-stage`

/stage lista lo que está en el stage, fuera de él y nuevo; /stage <rutas> agrega y -r quita, preguntando antes.

```
/plugin install git-stage@cockpit
```

![git-stage](../previews/git-stage.svg)

## `git-fixup`

/fixup commitea lo que está en el stage como fixup de HEAD o de cualquier commit, listo para rebase --autosquash.

```
/plugin install git-fixup@cockpit
```

![git-fixup](../previews/git-fixup.svg)

## `git-sync`

/sync hace fetch y muestra la distancia de la rama a su base; /sync rebase o merge trae la base tras preguntar.

```
/plugin install git-sync@cockpit
```

![git-sync](../previews/git-sync.svg)

## `behind-toast`

Toast cuando tu rama queda 10, 20, 30 commits detrás de su base, antes de que se acumulen los conflictos.

```
/plugin install behind-toast@cockpit
```

![behind-toast](../previews/behind-toast.svg)

## `git-switch`

/gsw cambia de rama llevando tu trabajo sin commitear: lo guarda en un stash, cambia y lo ofrece al regresar.

```
/plugin install git-switch@cockpit
```

![git-switch](../previews/git-switch.svg)

## `git-tag`

/gtag muestra la última tag y los commits desde entonces; /gtag patch, minor o major crea la tag de la próxima versión tras preguntar.

```
/plugin install git-tag@cockpit
```

![git-tag](../previews/git-tag.svg)

## `staged-status`

Línea de estado con cuántos archivos están en el stage, fuera de él y nuevos, oculta con el árbol limpio.

```
/plugin install staged-status@cockpit
```

![staged-status](../previews/staged-status.svg)

## `pr-open`

/prnew abre un pull request de la rama actual con título y cuerpo armados a partir de los commits, tras preguntar.

```
/plugin install pr-open@cockpit
```

![pr-open](../previews/pr-open.svg)

## `pr-checks`

/checks muestra los checks del pull request actual y cuáles fallaron, con sus enlaces.

```
/plugin install pr-checks@cockpit
```

![pr-checks](../previews/pr-checks.svg)

## `pr-comments`

/prcomments lista los comentarios de revisión de tu pull request que aún no recibieron respuesta tuya.

```
/plugin install pr-comments@cockpit
```

![pr-comments](../previews/pr-comments.svg)

## `review-queue`

Línea de estado con cuántos pull requests esperan tu revisión, y un aviso cuando llega un pedido nuevo.

```
/plugin install review-queue@cockpit
```

![review-queue](../previews/review-queue.svg)

## `issue-context`

Cuando tu prompt nombra un issue (issue #12 o un enlace de issue), su título, etiquetas y texto llegan a Claude como contexto oculto.

```
/plugin install issue-context@cockpit
```

![issue-context](../previews/issue-context.svg)

## `issue-link`

/closes 12 agrega "Closes #12" al pull request actual para que el issue cierre al hacer merge, tras preguntar.

```
/plugin install issue-link@cockpit
```

![issue-link](../previews/issue-link.svg)
