# Calidad — 4 mods

[← Volver al README](../../README.es.md)

[`untested-turn-toast`](#untested-turn-toast) · [`red-turn-toast`](#red-turn-toast) · [`debugger-guard`](#debugger-guard) · [`leftovers-toast`](#leftovers-toast)

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
