# Contexto y costo — 2 mods

[← Volver al README](../../README.es.md)

[`reread-guard`](#reread-guard) · [`grep-limit`](#grep-limit)

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
