# Contexto y costo — 7 mods

[← Volver al README](../../README.es.md)

[`reread-guard`](#reread-guard) · [`grep-limit`](#grep-limit) · [`read-cap`](#read-cap) · [`git-log-limit`](#git-log-limit) · [`paste-size-toast`](#paste-size-toast) · [`cat-guard`](#cat-guard) · [`explore-nudge`](#explore-nudge)

## `reread-guard`

Rechaza releer un archivo que Claude ya leyó en la sesión y que no cambió, una vez, con el motivo.

```
/plugin install reread-guard@cockpit
```

![reread-guard](../previews/reread-guard.svg)

## `grep-limit`

Limita a 100 líneas un Grep que imprime las líneas encontradas y avisa a Claude cuando el límite cortó la respuesta.

```
/plugin install grep-limit@cockpit
```

![grep-limit](../previews/grep-limit.svg)

## `read-cap`

Lee solo las primeras 600 líneas de un archivo de más de 150 KB y dice a Claude cómo seguir con offset.

```
/plugin install read-cap@cockpit
```

![read-cap](../previews/read-cap.svg)

## `git-log-limit`

Añade -n 30 a un git log sin límite, para que el historial no inunde el contexto.

```
/plugin install git-log-limit@cockpit
```

![git-log-limit](../previews/git-log-limit.svg)

## `paste-size-toast`

Un toast cuando el prompt que envías es muy grande, con su tamaño en líneas y tokens, para que recortes un log pegado.

```
/plugin install paste-size-toast@cockpit
```

![paste-size-toast](../previews/paste-size-toast.svg)

## `cat-guard`

Rechaza cat, type y Get-Content en un archivo de más de 100 KB y apunta a un fragmento o a Grep.

```
/plugin install cat-guard@cockpit
```

![cat-guard](../previews/cat-guard.svg)

## `explore-nudge`

Tras 15 lecturas y búsquedas en un turno, un toast y una nota para que Claude pase el resto de la exploración a un subagente.

```
/plugin install explore-nudge@cockpit
```

![explore-nudge](../previews/explore-nudge.svg)
