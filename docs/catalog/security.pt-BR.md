# Segurança — 21 mods

[← Voltar ao README](../../README.pt-BR.md)

[`rm-guard`](#rm-guard) · [`env-guard`](#env-guard) · [`git-guard`](#git-guard) · [`secret-scan`](#secret-scan) · [`prompt-secret-guard`](#prompt-secret-guard) · [`lockfile-guard`](#lockfile-guard) · [`path-jail`](#path-jail) · [`main-branch-guard`](#main-branch-guard) · [`generated-guard`](#generated-guard) · [`sql-guard`](#sql-guard) · [`prod-guard`](#prod-guard) · [`install-ask`](#install-ask) · [`pipe-shell-guard`](#pipe-shell-guard) · [`big-read-guard`](#big-read-guard) · [`sudo-guard`](#sudo-guard) · [`chmod-guard`](#chmod-guard) · [`docker-guard`](#docker-guard) · [`kill-guard`](#kill-guard) · [`credential-file-guard`](#credential-file-guard) · [`upload-guard`](#upload-guard) · [`env-dump-guard`](#env-dump-guard)

## `rm-guard`

Bloqueia rm -rf e Remove-Item -Recurse em raiz, home e drives, além de mkfs, dd e format.

```
/plugin install rm-guard@cockpit
```

![rm-guard](../previews/rm-guard.svg)

## `env-guard`

Protege arquivos .env contra leitura e escrita (Read, Edit, Write, cat e @menção).

```
/plugin install env-guard@cockpit
```

![env-guard](../previews/env-guard.svg)

## `git-guard`

Bloqueia git destrutivo: push --force, reset --hard, clean -f, --no-verify, branch -D.

```
/plugin install git-guard@cockpit
```

![git-guard](../previews/git-guard.svg)

## `secret-scan`

Recusa Write/Edit cujo conteúdo traz chaves de API, tokens ou chaves privadas.

```
/plugin install secret-scan@cockpit
```

![secret-scan](../previews/secret-scan.svg)

## `prompt-secret-guard`

Barra o envio de prompts que contenham segredos colados por engano.

```
/plugin install prompt-secret-guard@cockpit
```

![prompt-secret-guard](../previews/prompt-secret-guard.svg)

## `lockfile-guard`

Impede edição manual de lockfiles (package-lock, yarn.lock, pnpm-lock, Cargo.lock...).

```
/plugin install lockfile-guard@cockpit
```

![lockfile-guard](../previews/lockfile-guard.svg)

## `path-jail`

Restringe Write/Edit à raiz do projeto, ao temp e a ~/.claude (resolve symlinks).

```
/plugin install path-jail@cockpit
```

![path-jail](../previews/path-jail.svg)

## `main-branch-guard`

Recusa commit, push, merge e rebase quando a branch atual é main/master.

```
/plugin install main-branch-guard@cockpit
```

![main-branch-guard](../previews/main-branch-guard.svg)

## `generated-guard`

Impede edição em node_modules, dist, build, .next, coverage, .git e afins.

```
/plugin install generated-guard@cockpit
```

![generated-guard](../previews/generated-guard.svg)

## `sql-guard`

Bloqueia DROP, TRUNCATE e DELETE/UPDATE sem WHERE em comandos de shell.

```
/plugin install sql-guard@cockpit
```

![sql-guard](../previews/sql-guard.svg)

## `prod-guard`

Exige sua confirmação para deploy, publish, terraform apply, kubectl e migrações.

```
/plugin install prod-guard@cockpit
```

![prod-guard](../previews/prod-guard.svg)

## `install-ask`

Exige sua confirmação sempre que o Claude for instalar uma dependência nova.

```
/plugin install install-ask@cockpit
```

![install-ask](../previews/install-ask.svg)

## `pipe-shell-guard`

Bloqueia curl | sh, wget | bash, iwr | iex e variantes.

```
/plugin install pipe-shell-guard@cockpit
```

![pipe-shell-guard](../previews/pipe-shell-guard.svg)

## `big-read-guard`

Recusa ler inteiro um arquivo com mais de 512 KB e pede um recorte.

```
/plugin install big-read-guard@cockpit
```

![big-read-guard](../previews/big-read-guard.svg)

## `sudo-guard`

Bloqueia elevação de privilégio: sudo, doas, su -c, runas e Start-Process -Verb RunAs.

```
/plugin install sudo-guard@cockpit
```

![sudo-guard](../previews/sudo-guard.svg)

## `chmod-guard`

Bloqueia permissões graváveis por todos, chown recursivo em raiz ou home e icacls para Everyone.

```
/plugin install chmod-guard@cockpit
```

![chmod-guard](../previews/chmod-guard.svg)

## `docker-guard`

Pede confirmação antes de comandos Docker destrutivos: system prune, volume rm ou prune, rm -f, rmi -f e compose down -v.

```
/plugin install docker-guard@cockpit
```

![docker-guard](../previews/docker-guard.svg)

## `kill-guard`

Bloqueia encerramento amplo de processos: kill -1, killall, pkill solto, taskkill em nomes de sistema ou com curinga, Stop-Process -Name *.

```
/plugin install kill-guard@cockpit
```

![kill-guard](../previews/kill-guard.svg)

## `credential-file-guard`

Bloqueia ler ou copiar chaves SSH, credenciais de nuvem e de registries e históricos de shell, com Read e no shell.

```
/plugin install credential-file-guard@cockpit
```

![credential-file-guard](../previews/credential-file-guard.svg)

## `upload-guard`

Pede confirmação antes de um comando enviar um arquivo local para fora: upload com curl, wget --post-file, scp ou rsync para um host, nc.

```
/plugin install upload-guard@cockpit
```

![upload-guard](../previews/upload-guard.svg)

## `env-dump-guard`

Bloqueia despejar o ambiente inteiro: env, printenv, set e export -p sem argumentos, Get-ChildItem Env:.

```
/plugin install env-dump-guard@cockpit
```

![env-dump-guard](../previews/env-dump-guard.svg)
