---
layout: post
title:  "Skyrim Load Orders for Utility Developers"
date:   2012-08-02
summary: "A technical introduction to Skyrim’s load order system, and the existing standard for working with it."
categories:
  - Skyrim
  - modding
  - load order
  - developers
  - utilities
  - guide
---

## Introduction To Load Ordering

Load ordering is the method used to determine how conflicts between mod plugins should be decided. If two plugins alter the same game data, then the changes made by the plugin loading later will override those made by the plugin loading earlier. This *rule of one* results in a list of plugins, with those earlier in the list having any conflicting changes overriden by those later in the list. This list is the load order of the plugins.

A game will only load the plugins that are active. Up to 255 plugins, including the game's .esm file, can be active at any one time. Active plugins are listed in the game's `plugins.txt` file (or `Morrowind.ini`, in the case of Morrowind), which is stored in the user's local application data folder. Nevertheless, it is useful when working with load orders to consider the load order of all plugins, even if only some of them will actually be loaded. This is both because it is easier to display a single list of plugins than a list and an unordered set, and because modders have engineered methods that allow the changes made by inactive plugins to be loaded by another plugin (eg. Wrye *ash's Bashed Patch). When any such methods are being used, the load order of inactive plugins decides which plugins override others, similar to as if they were active.

*[Wrye *ash]: Wrye Bash, Wrye Flash or Wrye Flash NV

In Morrowind, Oblivion, Nehrim, Fallout 3, Fallout: New Vegas and early versions (pre-1.4.26) of Skyrim, load order is decided by the relative timestamps of plugins in the game's Data directory. An installed plugin's load order is therefore a intrinsic property of that plugin.

In Skyrim v1.4.26+, a new textfile-based load order system was introduced, in which load order is decide by the order in which plugins are listed in `plugins.txt`. This brought with it a fundamental change, in that load order is no longer an intrinsic property of a plugin, and so inactive plugins do not have any load order.

**Note:** The games enforce one rule that overrides the load order of plugins set by either system. This rule is that *master files always load before all plugin files*. Simple enough, except that master files are not necessarily `.esm` files, and plugin files aren't necessarily `.esp` files. Whether a file is a master or a plugin depends on the value of a bit flag in the file itself, rather than its file extension. This also confuses terminology, so the usage in this readme is clarified below:

* *plugin*: Any file with a `.esp` or `.esm` extension.
* *plugin file*: Any plugin with a bit flag value such that it always loads after plugins with the other bit flag value.
* *master* or *master file*: Any plugin with a bit flag value such that it loads before plugins with the other bit flag value.
* *ghosted plugin*: Any plugin that has had a `.ghost` extension appended to its filename.

## The Textfile-based Load Order Standard

As the load order of all plugins, not just inactive plugins, is important, a standard solution that would allow ordering of inactive plugins was decided by Lojack (Wrye Bash), Kaburke (Nexus Mod Manager), WrinklyNinja (that's me!) and Dark0ne (owner of the Nexus sites) that could serve the community's needs. [libloadorder](https://github.com/WrinklyNinja/libloadorder) contains the canonical implementation of this standard.

The standard dictates that:

* Active load order is stored in `plugins.txt`.
* `plugins.txt` is encoded in Windows-1252.
* `plugins.txt` is by default stored in the user's local application data folder, eg. `%LOCALAPPDATA%\Skyrim\plugins.txt` on Windows Vista/7.
* Total load order is stored in a `loadorder.txt` file.
* `loadorder.txt` is encoded in UTF-8, **without** a Byte Order Mark.
* `loadorder.txt` is stored alongside the `plugins.txt`, in whichever location that is.
* Both `plugins.txt` and `loadorder.txt` contain only a list of plugin filenames (files with `.esp` or `.esm` extensions), one per line.
* In both `plugins.txt` and `loadorder.txt`, master files are listed before plugin files.
* Both `plugins.txt` and `loadorder.txt` are to be kept in synchronisation with one another: when one file is changed, the other must also be changed in the same manner (unless the change is not applicable, eg. deactivating a plugin doesn't change the contents of `loadorder.txt`).

### Undefined Behaviour

There are some circumstances that produce scenarios in which the behaviour of utilities is not defined. These situations and suggested behaviour are detailed below.

1. *An attempt is made to activate a plugin with a filename that cannot be represented in the Windows-1252 encoding.*

   Utilities check that filename strings are encoded correctly before outputting them. On a failure to convert to the correct encoding, the user should be alerted that the plugin in question cannot be activated.
2. *The `plugins.txt` and `loadorder.txt` files become desynchronised.*

   Utilities check for synchronisation on startup and maintain it throughout their operation, rather than re-synchronising the files on program close, for instance. This is to prevent issues for any other programs open at the same time. If desynchronisation is detected, the only standard-based recovery option is to derive `plugins.txt` from `loadorder.txt`, first getting a list of filenames to be written from `plugins.txt`. Alternatively, a utility could use some internal load order backup to restore from. See the section below for a more detailed breakdown of the issue.
3. *For one reason or another, a plugin becomes listed twice in `loadorder.txt`.*

   Utilities use the earliest-listed instance of that plugin, as this is most likely to be correct.

#### The Desynchronisation Problem

If either `plugins.txt` or `loadorder.txt` are changed such that the load order of the plugins in `plugins.txt` is not the same in `plugins.txt` and `loadorder.txt`, then the difference cannot generally be precisely resolved without discarding one file's ordering. This is due to the load order of plugins in plugins.txt being weakly defined, ie. it is defined relative to other active plugins, but not in relation to inactive plugins. An example:

> If you use the API to set a load order of `A b c d E f g` where uppercase letters denote active plugins, then you use the Skyrim launcher to move `A` after `E`, then `plugins.txt` will read `E A` while `loadorder.txt` remains unchanged. There is no way of knowing from the contents of plugins.txt whether you moved `A` after `E` or `E` before `A`. If these were the only two plugins, then it would not be an issue, but you also have inactive plugins interspersed amongst them, so you have the following possibilities, all of which are potentially valid, but also potentially damaging in terms of conflicts, etc.:
>
> 1. `b c d E A f g`
> 2. `b c d E f A g`
> 3. `b c d E f g A`
> 4. `E A b c d f g`
>
>There is no way of knowing which is the correct order to choose for the full load order based on the active load order. You must therefore choose to use one of the two files' orderings. Since `plugins.txt` does not define the load order positions of inactive plugins, it is unsuitable, and `loadorder.txt` must be used. The alternative would be for a utility to restore load order from their own internal backup, hence why the standard does not define a specific behaviour, as it may be `loadorder.txt` that was altered and is now wrong.

## Load Ordering in Your Utility

If you're writing a utility that reads or writes the load order, you will want to follow the above standard, or your utility will end up mangling the load orders set by utilities that do follow the standard, which include [BOSS](https://boss-developers.github.io/), [LOOT](https://loot.github.io/), [Mod Organiser](http://www.nexusmods.com/skyrim/mods/1334/), [Nexus Mod Manager](http://www.nexusmods.com/skyrim/mods/modmanager/), [TES5Edit](http://www.nexusmods.com/skyrim/mods/25859), [Wrye Bash](https://github.com/wrye-bash/wrye-bash) and more.

You can either write your own implementation, or you can use [libloadorder](https://github.com/WrinklyNinja/libloadorder), which provides a C API so it can be loaded as a DLL in many languages. If you want to use libloadorder, either build it yourself, or contact me and I will send you a build (I don't do regular releases for it).