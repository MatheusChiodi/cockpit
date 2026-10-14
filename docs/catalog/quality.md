# Quality — 4 mods

[← Back to the README](../../README.md)

[`untested-turn-toast`](#untested-turn-toast) · [`red-turn-toast`](#red-turn-toast) · [`debugger-guard`](#debugger-guard) · [`leftovers-toast`](#leftovers-toast)

## `untested-turn-toast`

Toast at the end of a turn that changed code without running a single test.

```
/plugin install untested-turn-toast@cockpit
```

![untested-turn-toast](../previews/untested-turn-toast.svg)

## `red-turn-toast`

Toast when a turn ends while the last test run is still failing.

```
/plugin install red-turn-toast@cockpit
```

![red-turn-toast](../previews/red-turn-toast.svg)

## `debugger-guard`

Refuses edits that add a debugger statement, breakpoint(), pdb or binding.pry.

```
/plugin install debugger-guard@cockpit
```

![debugger-guard](../previews/debugger-guard.svg)

## `leftovers-toast`

Toast at the end of a turn counting the debug logs and TODOs the edits added.

```
/plugin install leftovers-toast@cockpit
```

![leftovers-toast](../previews/leftovers-toast.svg)
