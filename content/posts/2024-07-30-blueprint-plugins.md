---
title: "Load order in Starfield, part 2: blueprint plugins"
date: 2024-07-30
summary: Another new type of plugin!
categories:
  - modding
---

Following on from my [post last month]({{< ref "2024-06-28-load-order-in-starfield" >}}), it turns out that there is a whole new plugin type that I'd missed -- thanks to Silarn for asking me about it!

This post covers the new plugin type and how it behaves with respect to load order. If you're interested in more details, you can find all of my investigation notes in [loot/loot#2009](https://github.com/loot/loot/issues/2009).

## Blueprint plugins

If a plugin has the `0x800` header flag set, then it won't be visible in the Creation Kit's Data dialog unless you set `bShowBluePrintMastersInDataFiles=1` in the `[General]` section of `CreationKit.ini`. Although the setting uses the term "blueprint master", the `0x800` flag doesn't imply the presence of the master (`0x1`) flag, and non-master plugins that have the `0x800` flag set are also hidden.

I've therefore taken to calling the `0x800` flag the *blueprint flag*, and a plugin that has the blueprint flag set is a *blueprint plugin*.

As well as being hidden from view in the Creation Kit, blueprint plugins are removed from `Plugins.txt` when the game loads a save.

There is one official blueprint plugin: `BlueprintShips-Starfield.esm`.

## Blueprint masters

The blueprint flag doesn't seem to affect the load order of plugins on its own, but if a plugin is a master file and also has the blueprint flag set (i.e. if it's a *blueprint master*), then it does behave differently:

- Blueprint masters load after *all* other plugins, including non-masters. This means that a blueprint master will override any non-blueprint master that changes the same record(s), and also affects the in-game mod index used for records added by a blueprint master.
- Blueprint masters load in the same order as if they were not blueprint-flagged, i.e. their order in `Plugins.txt` and in `Starfield.ccc` is respected.
- A blueprint master does **not** get hoisted to load earlier if they are a master of a plugin that is not a blueprint master. If such a plugin tries to override a record added by a blueprint master, the change is not seen in-game (but the plugin is loaded).
- Blueprint masters can hoist other blueprint masters.

You can also get small blueprint masters and medium blueprint masters. They behave as you'd expect given the above.

I don't know how blueprint master handling is actually implemented by Starfield, but it's as if the load order is partitioned into a non-blueprint-master load order and a blueprint master load order before plugins are hoisted separately in both load orders, then the blueprint master load order is appended to the non-blueprint-master load order.

### Example

Given a `Starfield.ccc` containing:

```
Starfield.esm
BlueprintShips-Starfield.esm
```

and a `Plugins.txt` containing:

```
test.esm
blueprint - blueprint dependent.esm
blueprint.esm
test - blueprint dependent.esm
blueprint.esp
test.esp
```

the actual in-game load order is:

```
Starfield.esm
test.esm
test - blueprint dependent.esm
blueprint.esp
test.esp
BlueprintShips-Starfield.esm
blueprint.esm
blueprint - blueprint dependent.esm
```

## Impact

The existence of blueprint plugins means that I need to update LOOT and its supporting libraries to support them. I've released esplugin v6.1.0 with support for checking the flag, and have almost finished updating libloadorder, but it and libloot will need new major releases as the changes break ABI compatibility.

I don't think there'll be API breakage in libloot, but its sorting logic will need updating, and then finally I'll need to update LOOT to use the new version of libloot and also to display the correct load order indexes when a blueprint plugin is present.
