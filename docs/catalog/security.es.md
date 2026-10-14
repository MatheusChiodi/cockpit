# Seguridad — 17 mods

[← Volver al README](../../README.es.md)

[`rm-guard`](#rm-guard) · [`env-guard`](#env-guard) · [`git-guard`](#git-guard) · [`secret-scan`](#secret-scan) · [`prompt-secret-guard`](#prompt-secret-guard) · [`lockfile-guard`](#lockfile-guard) · [`path-jail`](#path-jail) · [`main-branch-guard`](#main-branch-guard) · [`generated-guard`](#generated-guard) · [`sql-guard`](#sql-guard) · [`prod-guard`](#prod-guard) · [`install-ask`](#install-ask) · [`pipe-shell-guard`](#pipe-shell-guard) · [`big-read-guard`](#big-read-guard) · [`sudo-guard`](#sudo-guard) · [`chmod-guard`](#chmod-guard) · [`docker-guard`](#docker-guard)

## `rm-guard`

Bloquea rm -rf y Remove-Item -Recurse en raíz, home y unidades, además de mkfs, dd y format.

```
/plugin install rm-guard@cockpit
```

![rm-guard](../previews/rm-guard.svg)

## `env-guard`

Protege los archivos .env contra lectura y escritura (Read, Edit, Write, cat y @mención).

```
/plugin install env-guard@cockpit
```

![env-guard](../previews/env-guard.svg)

## `git-guard`

Bloquea git destructivo: push --force, reset --hard, clean -f, --no-verify, branch -D.

```
/plugin install git-guard@cockpit
```

![git-guard](../previews/git-guard.svg)

## `secret-scan`

Rechaza Write/Edit cuyo contenido trae claves de API, tokens o claves privadas.

```
/plugin install secret-scan@cockpit
```

![secret-scan](../previews/secret-scan.svg)

## `prompt-secret-guard`

Impide el envío de prompts que contengan secretos pegados por error.

```
/plugin install prompt-secret-guard@cockpit
```

![prompt-secret-guard](../previews/prompt-secret-guard.svg)

## `lockfile-guard`

Impide la edición manual de lockfiles (package-lock, yarn.lock, pnpm-lock, Cargo.lock...).

```
/plugin install lockfile-guard@cockpit
```

![lockfile-guard](../previews/lockfile-guard.svg)

## `path-jail`

Restringe Write/Edit a la raíz del proyecto, al temp y a ~/.claude (resuelve symlinks).

```
/plugin install path-jail@cockpit
```

![path-jail](../previews/path-jail.svg)

## `main-branch-guard`

Rechaza commit, push, merge y rebase cuando la rama actual es main/master.

```
/plugin install main-branch-guard@cockpit
```

![main-branch-guard](../previews/main-branch-guard.svg)

## `generated-guard`

Impide la edición en node_modules, dist, build, .next, coverage, .git y similares.

```
/plugin install generated-guard@cockpit
```

![generated-guard](../previews/generated-guard.svg)

## `sql-guard`

Bloquea DROP, TRUNCATE y DELETE/UPDATE sin WHERE en comandos de shell.

```
/plugin install sql-guard@cockpit
```

![sql-guard](../previews/sql-guard.svg)

## `prod-guard`

Exige tu confirmación para deploy, publish, terraform apply, kubectl y migraciones.

```
/plugin install prod-guard@cockpit
```

![prod-guard](../previews/prod-guard.svg)

## `install-ask`

Exige tu confirmación siempre que Claude vaya a instalar una dependencia nueva.

```
/plugin install install-ask@cockpit
```

![install-ask](../previews/install-ask.svg)

## `pipe-shell-guard`

Bloquea curl | sh, wget | bash, iwr | iex y variantes.

```
/plugin install pipe-shell-guard@cockpit
```

![pipe-shell-guard](../previews/pipe-shell-guard.svg)

## `big-read-guard`

Rechaza leer entero un archivo de más de 512 KB y pide un fragmento.

```
/plugin install big-read-guard@cockpit
```

![big-read-guard](../previews/big-read-guard.svg)

## `sudo-guard`

Bloquea la elevación de privilegios: sudo, doas, su -c, runas y Start-Process -Verb RunAs.

```
/plugin install sudo-guard@cockpit
```

![sudo-guard](../previews/sudo-guard.svg)

## `chmod-guard`

Bloquea permisos de escritura para todos, chown recursivo en raíz o home e icacls para Everyone.

```
/plugin install chmod-guard@cockpit
```

![chmod-guard](../previews/chmod-guard.svg)

## `docker-guard`

Pide confirmación antes de comandos Docker destructivos: system prune, volume rm o prune, rm -f, rmi -f y compose down -v.

```
/plugin install docker-guard@cockpit
```

![docker-guard](../previews/docker-guard.svg)
