# Qualidade — 5 mods

[← Voltar ao README](../../README.pt-BR.md)

[`untested-turn-toast`](#untested-turn-toast) · [`red-turn-toast`](#red-turn-toast) · [`debugger-guard`](#debugger-guard) · [`leftovers-toast`](#leftovers-toast) · [`any-guard`](#any-guard)

## `untested-turn-toast`

Toast no fim de um turno que alterou código sem rodar nenhum teste.

```
/plugin install untested-turn-toast@cockpit
```

![untested-turn-toast](../previews/untested-turn-toast.svg)

## `red-turn-toast`

Toast quando um turno termina com a última execução de testes ainda falhando.

```
/plugin install red-turn-toast@cockpit
```

![red-turn-toast](../previews/red-turn-toast.svg)

## `debugger-guard`

Recusa edições que adicionam debugger, breakpoint(), pdb ou binding.pry.

```
/plugin install debugger-guard@cockpit
```

![debugger-guard](../previews/debugger-guard.svg)

## `leftovers-toast`

Toast no fim do turno contando os logs de debug e TODOs que as edições adicionaram.

```
/plugin install leftovers-toast@cockpit
```

![leftovers-toast](../previews/leftovers-toast.svg)

## `any-guard`

Pergunta antes de uma edição adicionar any ao TypeScript: ": any", "as any", "<any>" ou any[].

```
/plugin install any-guard@cockpit
```

![any-guard](../previews/any-guard.svg)
