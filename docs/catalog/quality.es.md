# Calidad — 12 mods

[← Volver al README](../../README.es.md)

[`untested-turn-toast`](#untested-turn-toast) · [`red-turn-toast`](#red-turn-toast) · [`debugger-guard`](#debugger-guard) · [`leftovers-toast`](#leftovers-toast) · [`any-guard`](#any-guard) · [`long-file-toast`](#long-file-toast) · [`dup-block-guard`](#dup-block-guard) · [`untested`](#untested) · [`coverage-status`](#coverage-status) · [`empty-test-guard`](#empty-test-guard) · [`snapshot-update-guard`](#snapshot-update-guard) · [`catch-swallow-guard`](#catch-swallow-guard)

## `untested-turn-toast`

Toast al final de un turno que cambió código sin ejecutar ningún test.

```
/plugin install untested-turn-toast@cockpit
```

![untested-turn-toast](../previews/untested-turn-toast.svg)

## `red-turn-toast`

Toast cuando un turno termina con la última ejecución de tests aún fallando.

```
/plugin install red-turn-toast@cockpit
```

![red-turn-toast](../previews/red-turn-toast.svg)

## `debugger-guard`

Rechaza ediciones que añaden debugger, breakpoint(), pdb o binding.pry.

```
/plugin install debugger-guard@cockpit
```

![debugger-guard](../previews/debugger-guard.svg)

## `leftovers-toast`

Toast al final del turno contando los logs de depuración y TODOs que añadieron las ediciones.

```
/plugin install leftovers-toast@cockpit
```

![leftovers-toast](../previews/leftovers-toast.svg)

## `any-guard`

Pregunta antes de que una edición añada any a TypeScript: ": any", "as any", "<any>" o any[].

```
/plugin install any-guard@cockpit
```

![any-guard](../previews/any-guard.svg)

## `long-file-toast`

Toast cuando una edición lleva un archivo más allá de 500 líneas, y otra vez cada 100 más.

```
/plugin install long-file-toast@cockpit
```

![long-file-toast](../previews/long-file-toast.svg)

## `dup-block-guard`

Rechaza una edición cuyo código nuevo repite un bloque de 6 o más líneas que ya está en el mismo archivo.

```
/plugin install dup-block-guard@cockpit
```

![dup-block-guard](../previews/dup-block-guard.svg)

## `untested`

/untested lista los archivos modificados que no tienen archivo de test, sin gastar un turno del modelo.

```
/plugin install untested@cockpit
```

![untested](../previews/untested.svg)

## `coverage-status`

Línea de estado con la cobertura de líneas del último informe del proyecto y cuánto cambió.

```
/plugin install coverage-status@cockpit
```

![coverage-status](../previews/coverage-status.svg)

## `empty-test-guard`

Rechaza una edición en un archivo de test que añade casos de test sin ninguna aserción.

```
/plugin install empty-test-guard@cockpit
```

![empty-test-guard](../previews/empty-test-guard.svg)

## `snapshot-update-guard`

Pregunta antes de que un comando reescriba snapshots de test: jest -u, vitest -u, --snapshot-update, insta accept.

```
/plugin install snapshot-update-guard@cockpit
```

![snapshot-update-guard](../previews/snapshot-update-guard.svg)

## `catch-swallow-guard`

Rechaza ediciones que añaden un bloque catch vacío o un except que solo hace pass.

```
/plugin install catch-swallow-guard@cockpit
```

![catch-swallow-guard](../previews/catch-swallow-guard.svg)
