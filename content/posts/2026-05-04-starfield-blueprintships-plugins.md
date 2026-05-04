---
title: "Load order in Starfield: BlueprintShips plugins"
date: 2026-05-04
summary: BlueprintShips-Starfield.esm was only the beginning...
categories:
  - modding
---

This is another entry in what has become a series of posts on how plugin load
order works in Starfield. The [first post]({{< ref "2024-06-28-load-order-in-starfield" >}}) covers most things, the [second]({{< ref "2024-07-30-blueprint-plugins" >}}) covers the new blueprint plugin type, and the [third]({{< ref "2024-10-12-starfield-load-order-2" >}}) (which I numbered 2 for some reason...) is a small update to reflect a change in game behaviour, that all of the official plugins shipped with the game now have hardcoded positions, with the exception of `BlueprintShips-Starfield.esm`.

In March 2026, Bethesda released the [Trackers Alliance: The Complete Bounty Series](https://creations.bethesda.net/en/starfield/details/4bf1a31f-46d5-47bf-a5e6-d0f9e2496d0c/Trackers_Alliance__The_Complete_Bounty_Series) Creation (i.e. paid mod), and its plugins include `blueprintships-sfta03.esm` and `blueprintships-sfta06.esm`. Since then, the [Terran Armada DLC](https://store.steampowered.com/app/3763700/Starfield__Terran_Armada/) was released with a `BlueprintShips-SFBGS050.esm` plugin.

It turns out that `BlueprintShips-Starfield.esm` was the first example of yet another type of plugin, which I've been calling BlueprintShips plugins.

## BlueprintShips plugins

A BlueprintShips plugin is a plugin that has a filename that starts with `BlueprintShips-` and ends with `.esm` (or anything case-insensitively equal to them).

Starfield has two relevant special behaviours:

- Like blueprint plugins, Starfield will remove all BlueprintShips plugins from `Plugins.txt` on startup. Annoyingly the `.esm` extension is **not** required for this to happen.

  I only discovered that the file extension doesn't matter after coining the term "BlueprintShips plugin" or I'd have called them "BlueprintShips ESMs" instead so that I could use "BlueprintShips plugin" to refer to any plugin with a name that starts with `BlueprintShips-`, but doing that now would cause too much confusion.
- A plugin named `BlueprintShips-X.esm` is implicitly active if a plugin named `X.esm`, `X.esp` and/or `X.esl` is active. That is, if you activate `X.esm`, that has the knock-on effect of also activating `BlueprintShips-X.esm` if it exists.

  `X` is just a placeholder, so e.g. `BlueprintShips-Starfield.esm` is activated by `Starfield.esm` and `BlueprintShips-SFBGS050.esm` is activated by `SFBGS050.esm`.

  That implicit activation specifically requires the `.esm` file extension: a plugin named `BlueprintShips-X.esp` would not be activated by an active plugin `X.esm`, even if `BlueprintShips-X.esp` had the `0x1` master flag set.

  Assuming that a BlueprintShips plugin is only implicitly activated by the plugin that it references, and is not explicitly activated through some other mechanism, then it will load according to the usual rules for implicitly active plugins, as covered in my initial post (and subject to the updated fallback behaviour that I'll cover further down).

All known official BlueprintShips plugins at time of writing (`BlueprintShips-Starfield.esm`, `blueprintships-sfta03.esm`, `blueprintships-sfta06.esm` and `BlueprintShips-SFBGS050.esm`) are also blueprint masters.

For reference, my testing notes can be found in [loot/loot#2180](https://github.com/loot/loot/issues/2180), though they're a bit of a mess, with some earlier conclusions contradicted by findings later in the comment thread.

## Fallback load order for implicitly-active plugins

Implicitly active plugins are generally loaded by appending them to the load order in order of ascending file modification timestamp, but what if two implicitly active plugins have the same modification timestamp?

Back in October 2023 I [tested](https://github.com/Ortham/libloadorder/issues/86) that and found that they were loaded in descending filename order in the games from Morrowind to Fallout 4, but Starfield used *ascending* filename order.

While discussing the blueprint plugins behaviour, Utumno asked if those orders were case-sensitive. I thought there were, but couldn't remember testing that and didn't have any notes about it, so I went back and [retested](https://github.com/Ortham/libloadorder/issues/86#issuecomment-4245878482) the behaviour, this time also checking case-sensitivity.

This time I found a couple of things:

- **all** games used descending *uppercased* filename order
- when Starfield loads plugins activated using `sTestFile` ini file entries, it loads them in ascending order of their entry indexes (i.e. `sTestFile1`, `sTestFile2`, `sTestFile3`, etc.), and that plugins loaded like that get written to `Plugins.txt` by Starfield on startup, where they're listed before other installed plugins, even if those other plugins have earlier timestamps.

These results contradicted my previous findings for Starfield, so either I'd gotten them wrong before (despite double-checking), or the game's behaviour changed at some point in the past two and a half years. For future reference, the "new" behaviour was observed with Starfield v1.16.236.0.

## Implications for modding

I shared what I'd found with some other modding utility representatives (Robert from xEdit, Silarn from MO2, Utumno from Wrye Bash, Pickysaurus from Vortex) and after some discussion we [agreed](https://github.com/loot/loot/issues/2198) to:

- not write BlueprintShips or blueprint plugins to `Plugins.txt` (which was a change to LOOT's behaviour), so that we're not fighting the game's startup behaviour
- treat blueprint non-masters as unsupported
- treat BlueprintShips plugins that are not blueprint masters as unsupported

At the time I hadn't noticed that BlueprintShips plugins without the `.esm` extension are still removed from `Plugins.txt`, so there should probably be a fourth point about not supporting plugins that start with `BlueprintShips-` but have a `.esp` or `.esl` extension.

The thinking behind not supporting those plugin types is that there's no evidence to suggest that they are supposed to exist, and they'd require special handling:

- blueprint non-masters and BlueprintShips plugins that do not have the `.esm` file extension are impractical to reliably activate, don't have defined inactive load order positions (since they get removed from `Plugins.txt`), and activating them would probably end up changing their load order positions from whatever a utility chooses to use as their inactive load order positions, which doesn't happen for other plugins. The load order of inactive plugins doesn't matter to the game but can matter when generating patches like Wrye Bash's Bashed Patch.
- while BlueprintShips with the `.esm` extension can be reliably activated, if they're not also blueprint masters then utilities would need to separately make sure that they can't be moved to load before any explicitly-activated masters, since implicitly active masters can't do that.

Basically, it would be good if mod authors followed Bethesda's lead and only:

- set the blueprint flag on a plugin if it's named `BlueprintShips-<something>.esm`
- start a plugin name with `BlueprintShips-` if it also ends with `.esm` and if the plugin has the blueprint flag set.

In that case the load order just has a block of blueprint masters that load in timestamp order after all other plugins, and which are activated by activating other plugins in the load order.

(For completeness, it's worth noting that when Starfield removes blueprint and BlueprintShips plugins from `Plugins.txt`, that removal doesn't affect the current instance of Starfield, so if you add any such entry to `Plugins.txt` it basically only works for the next time you run Starfield. The fact that it does work that one time is something I now view as an unfortunate inconsistency, and it's probably best to avoid relying on that behaviour.)

I'm not sure about when other utilities have released or will be releasing updates to handle these discoveries, but it should only be a matter of time. For my part, [libloadorder](https://github.com/Ortham/libloadorder) v18.8.1, [libloot](https://github.com/loot/libloot) v0.29.4 and [LOOT](https://github.com/loot/loot) v0.29.1 include the necessary changes.
