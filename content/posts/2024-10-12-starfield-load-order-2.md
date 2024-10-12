---
title: "Load order in Starfield: October 2024 edition"
date: 2024-10-12
summary: Most official plugin positions are now hardcoded.
categories:
  - modding
---

Starfield's 1.14.70.0 (September 2024) update introduced another change to how the official plugins are loaded. In my original post in [June]({{< ref "2024-06-28-load-order-in-starfield" >}}), I wrote that:

> Starfield has no plugins that are hardcoded to always be active and in specific positions in the load order, but all of the official plugins are hardcoded to always be active (I refer to such plugins as being implicitly active): they are `Starfield.esm`, `Constellation.esm`, `OldMars.esm`, `BlueprintShips-Starfield.esm`, `SFBGS003.esm`, `SFBGS006.esm`, `SFBGS007.esm` and `SFBGS008.esm`.

That's no longer the case. Rather than being implicitly active, most of the official plugins have hardcoded positions:

| Plugin | Mod index |
|--------|-----------|
| `Starfield.esm` | `00`
| `ShatteredSpace.esm` | `01`
| `Constellation.esm` | `FE000`
| `OldMars.esm` | `FE001`
| `SFBGS003.esm` | `FD00`
| `SFBGS004.esm` | `FE002`
| `SFBGS006.esm` | `FD01`
| `SFBGS007.esm` | `FE003`
| `SFBGS008.esm` | `FE004`

(`ShatteredSpace.esm` is from the recently-released Shattered Space DLC, and `SFBGS004.esm` was added in August's patch.)

The exception is `BlueprintShips-Starfield.esm`: it's still implicitly active, and it's possible to load other blueprint masters before and/or after it.

I've released [LOOT v0.24.0](https://github.com/loot/loot/releases/tag/0.24.0) with support for this change. The relevant GitHub issue is [loot/loot#2032](https://github.com/loot/loot/issues/2032).
