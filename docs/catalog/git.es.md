# Git y GitHub — 5 mods

[← Volver al README](../../README.es.md)

[`commit-review`](#commit-review) · [`wip-commit-guard`](#wip-commit-guard) · [`marker-guard`](#marker-guard) · [`amend-guard`](#amend-guard) · [`stage-guard`](#stage-guard)

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
