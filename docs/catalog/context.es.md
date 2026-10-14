# Contexto y costo — 14 mods

[← Volver al README](../../README.es.md)

[`reread-guard`](#reread-guard) · [`grep-limit`](#grep-limit) · [`read-cap`](#read-cap) · [`git-log-limit`](#git-log-limit) · [`paste-size-toast`](#paste-size-toast) · [`cat-guard`](#cat-guard) · [`explore-nudge`](#explore-nudge) · [`fill-toast`](#fill-toast) · [`cache-cold-toast`](#cache-cold-toast) · [`flood-note`](#flood-note) · [`heavy-calls`](#heavy-calls) · [`tree-flood-guard`](#tree-flood-guard) · [`agent-cap`](#agent-cap) · [`agent-straggler`](#agent-straggler)

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

## `fill-toast`

Un toast cuando la ventana de contexto sube 10 puntos o más de golpe, con el nombre de la última herramienta usada.

```
/plugin install fill-toast@cockpit
```

![fill-toast](../previews/fill-toast.svg)

## `cache-cold-toast`

Un toast cuando envías un prompt después de que expire la ventana de 5 minutos del caché de prompt con un contexto grande.

```
/plugin install cache-cold-toast@cockpit
```

![cache-cold-toast](../previews/cache-cold-toast.svg)

## `flood-note`

Avisa a Claude cuando una búsqueda o comando devolvió más de 300 líneas, para que acote la siguiente en vez de repetirla.

```
/plugin install flood-note@cockpit
```

![flood-note](../previews/flood-note.svg)

## `heavy-calls`

/heavy lista los cinco resultados de herramienta que más contexto gastaron en la sesión, con herramienta, destino y tamaño.

```
/plugin install heavy-calls@cockpit
```

![heavy-calls](../previews/heavy-calls.svg)

## `tree-flood-guard`

Rechaza find, ls -R o dir /s sin filtro que listaría node_modules, y sugiere git ls-files o Glob.

```
/plugin install tree-flood-guard@cockpit
```

![tree-flood-guard](../previews/tree-flood-guard.svg)

## `agent-cap`

/agentcap <n> limita cuántos subagentes corren a la vez y pregunta antes de cada uno que pase el límite.

```
/plugin install agent-cap@cockpit
```

![agent-cap](../previews/agent-cap.svg)

## `agent-straggler`

Un toast cuando un subagente lleva más de tres veces el tiempo de los que ya terminaron.

```
/plugin install agent-straggler@cockpit
```

![agent-straggler](../previews/agent-straggler.svg)
