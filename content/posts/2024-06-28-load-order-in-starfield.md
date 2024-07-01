---
title: Load order in Starfield
date: 2024-06-28
summary: How it seems to work as of Starfield 1.12.32.0.
categories:
  - modding
---

This page summarises what I've found while reverse-engineering how [Starfield](https://bethesda.net/en/game/starfield) loads plugin files. I did my testing on Starfield's original release version in September 2023 and again following the release of the [Creation Kit](https://store.steampowered.com/app/2722710/Starfield_Creation_Kit/) (Starfield's official modding tool) in June 2024, on versions 1.12.30.0 and 1.12.32.0.

I've already shared all of this information on GitHub, but it's been scattered over a few repositories: [loot/loot#1882](https://github.com/loot/loot/issues/1882), [loot/loot#1989](https://github.com/loot/loot/issues/1989), [Ortham/libloadorder#85](https://github.com/Ortham/libloadorder/issues/85), [Ortham/libloadorder#86](https://github.com/Ortham/libloadorder/issues/86), [Ortham/libloadorder#97](https://github.com/Ortham/libloadorder/issues/97) and [Ortham/esplugin#42](https://github.com/Ortham/esplugin/issues/42) are the relevant issues.

I've also released [esplugin v6.0.0](https://github.com/Ortham/esplugin/releases/tag/6.0.0) and [libloadorder v17.0.0](https://github.com/Ortham/libloadorder/releases/tag/17.0.0) with support for Starfield's load order system as I understand it, and I hope to release new versions of [libloot](https://github.com/loot/libloot) and [LOOT](https://github.com/loot/loot) that make use of that support soon™.

## Plugin types

Starfield inherits support for the plugin types that are supported by Skyrim Special Edition and Fallout 4, with no relevant changes in their behaviour, though light plugins are called small plugins by Starfield, and the light plugin flag is now `0x100`, not `0x200` as it was in previous games.

Starfield also introduces a couple of new plugin types: medium plugins and update plugins.

As an aside, I've started to refer to whether a plugin is small, medium or full as its *scale*, since those three plugin types are mutually exclusive, and having a term for that subset of types is useful to distinguish them from other non-exclusive types like being a master plugin or an update plugin.

### Update plugins

A plugin is referred to as an update plugin if it does not have the light or medium flags set, has the update flag (`0x200`) set and has at least one master. Update plugins are referred to as "Update Master file" by the Creation Kit, whether or not the master flag is set, and it doesn't matter if the plugin's file extension is `.esp`, `.esl` or `.esm`.

Starfield's initial release loaded active update plugins without them taking up a load order index, but as of 1.12.30.0 that was no longer the case, so update plugins are treated as normal (a.k.a. "full") plugins as far as load order is concerned.

Update plugins are apparently related to Bethesda's version control system, but at time of writing that's still an area of active investigation and I don't know much about it.

### Medium plugins

A plugin is referred to as a medium plugin (abbreviated to "mid" by the Creation Kit in some places) if it has the medium flag (`0x400`) set and is not otherwise considered to be a light plugin (i.e. it does not have the light flag set, and does not have the `.esl` file extension).

A medium plugin is similar to a light plugin in that they allow multiple plugins to be loaded in the same load order index at the expense of reducing the number of records that they can contain. However, the ratio between the two is different:

| Plugin type | Max number of active plugins | Max number of records per plugin |
|-------------|------------------------------|----------------------------------|
| Light       |                         4096 |                             4095 |
| Medium      |                          256 |                            65535 |

(I've not included the plugin's `TES4` header in the max number of records, since it's not usually counted as one, but it technically is a record with a FormID of `00000000`.)

New records added by medium plugins are loaded with FormIDs that look like `FDxxyyyy`, where `xx` is the medium-plugin-specific load order index (so the first active medium plugin is given `00`, the second `01`, etc. even if there are other non-medium plugins between them), and `yyyy` is the object index of the record that was added by the plugin.

## FormIDs at rest

A plugin can change data for existing records or add new records, and it's important for the game and modding tools to be able to tell the difference, or for example a plugin that is intended to modify an item's value might instead create a duplicate item with that value.

### In previous games

In previous games it's been relatively easy to tell whether a record in a plugin file is a new record or overrides an existing record.

If a plugin overrides an existing record, the source plugin for the record being overridden is listed in the plugin header as one of the plugin's masters, and the first byte of the record's FormID in the plugin file indicates the index of the source plugin in that list of masters.

In a plugin file, all records look like `xxyyyyyy`, where `xx` is the index of the source plugin in the plugin file's list of masters (a.k.a. the mod index), and `yyyyyy` is the record's object index, which is the same across all plugins that touch that record. This structure is the same for all plugin types: while a record added by a light plugin will look like `FExxxyyy` in-game, in the plugin file it still looks like `xxyyyyyy`.

If the first byte of the FormID does not correspond to a valid index in that masters list, then it means that the FormID's record is added by that plugin (it does not override any existing record).

For example, here's the hex dump of a plugin file for Skyrim Special Edition:

```
Offset(h) 00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F

00000000  54 45 53 34 3E 00 00 00 00 00 00 00 00 00 00 00  TES4>...........
00000010  00 00 00 00 00 00 00 00 48 45 44 52 0C 00 D7 A3  ........HEDR..×£
00000020  70 3F 03 00 00 00 F0 0C 00 00 43 4E 41 4D 01 00  p?....ð...CNAM..
00000030  00 53 4E 41 4D 01 00 00 4D 41 53 54 0A 00 42 6C  .SNAM...MAST..Bl
00000040  61 6E 6B 2E 65 73 70 00 44 41 54 41 08 00 00 00  ank.esp.DATA....
00000050  00 00 00 00 00 00 47 52 55 50 50 01 00 00 42 50  ......GRUPP...BP
00000060  54 44 00 00 00 00 00 00 00 00 00 00 00 00 42 50  TD............BP
00000070  54 44 84 00 00 00 00 00 00 00 EC 0C 00 00 00 00  TD„.......ì.....
00000080  00 00 2B 00 00 00 42 50 54 4E 01 00 00 42 50 4E  ..+...BPTN...BPN
00000090  4E 01 00 00 42 50 4E 54 01 00 00 42 50 4E 49 01  N...BPNT...BPNI.
000000A0  00 00 42 50 4E 44 54 00 00 00 00 00 00 00 00 00  ..BPNDT.........
000000B0  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  ................
000000C0  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  ................
000000D0  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  ................
000000E0  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  ................
000000F0  00 00 00 00 00 00 00 00 00 00 00 00 4E 41 4D 31  ............NAM1
00000100  01 00 00 4E 41 4D 34 01 00 00 42 50 54 44 84 00  ...NAM4...BPTD„.
00000110  00 00 00 00 00 00 E7 0C 00 01 00 00 00 00 2B 00  ......ç.......+.
00000120  00 00 42 50 54 4E 01 00 00 42 50 4E 4E 01 00 00  ..BPTN...BPNN...
00000130  42 50 4E 54 01 00 00 42 50 4E 49 01 00 00 42 50  BPNT...BPNI...BP
00000140  4E 44 54 00 00 00 00 00 00 00 00 00 00 00 00 00  NDT.............
00000150  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  ................
00000160  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  ................
00000170  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  ................
00000180  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  ................
00000190  00 00 00 00 00 00 00 00 4E 41 4D 31 01 00 00 4E  ........NAM1...N
000001A0  41 4D 34 01 00 00                                AM4...
```

This plugin contains two `BPTD` (Body Part Data) records: one has the FormID `00000CEC` (it appears as `EC 0C 00 00` because it's written as a little-endian value, but by convention FormIDs are always represented as big-endian hex values) and the other has the FormID `01000CE7`. The plugin also has one master: `Blank.esp`.

Looking at `01000CE7`, we can tell that the record is added by this plugin because the FormID's first byte (the mod index) is `01`, and the masters list only has a single entry, so there's no master corresponding to that index.

Looking at `00000CEC`, we can tell that the record overrides one defined in `Blank.esp`, because the mod index is `00`, and `Blank.esp` is the plugin at index `00` in the master list. If we were to open up `Blank.esp`, we'd see that the original record would be present in that plugin file with the FormID `xx000CEC`, where the value of `xx` depends on how many masters that plugin has (in fact it doesn't have any masters, so `xx` is `00`).

This system is nice and simple, and allows you to tell which records in a plugin are from which masters and which are new records without needing any information other than what's provided in that plugin file. Unfortunately, Starfield changes that.

### In Starfield

Here's an example plugin file for Starfield:

```
Offset(h) 00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F

00000000  54 45 53 34 6D 00 00 00 00 00 00 00 00 00 00 00  TES4m...........
00000010  00 00 00 00 2F 02 00 00 48 45 44 52 0C 00 8F C2  ..../...HEDR...Â
00000020  75 3F 04 00 00 00 05 08 00 00 43 4E 41 4D 08 00  u?........CNAM..
00000030  44 45 46 41 55 4C 54 00 4D 41 53 54 0F 00 42 6C  DEFAULT.MAST..Bl
00000040  61 6E 6B 2E 66 75 6C 6C 2E 65 73 6D 00 4D 41 53  ank.full.esm.MAS
00000050  54 10 00 42 6C 61 6E 6B 2E 73 6D 61 6C 6C 2E 65  T..Blank.small.e
00000060  73 6D 00 4D 41 53 54 11 00 42 6C 61 6E 6B 2E 6D  sm.MAST..Blank.m
00000070  65 64 69 75 6D 2E 65 73 6D 00 42 4E 41 4D 05 00  edium.esm.BNAM..
00000080  4D 61 69 6E 00 47 52 55 50 EF 01 00 00 42 4F 4F  Main.GRUPï...BOO
00000090  4B 00 00 00 00 DC 30 00 00 00 00 00 00 42 4F 4F  K....Ü0......BOO
000000A0  4B 89 00 00 00 00 00 00 00 06 08 00 FE 00 00 00  K‰..........þ...
000000B0  00 2F 02 00 00 45 44 49 44 16 00 54 65 73 74 42  ./...EDID..TestB
000000C0  6F 6F 6B 31 44 55 50 4C 49 43 41 54 45 30 30 31  ook1DUPLICATE001
000000D0  00 4F 42 4E 44 18 00 00 00 00 00 00 00 00 00 00  .OBND...........
000000E0  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 4F  ...............O
000000F0  44 54 59 04 00 00 00 00 00 46 55 4C 4C 02 00 53  DTY......FULL..S
00000100  00 46 4C 4C 44 04 00 01 00 00 00 44 45 53 43 01  .FLLD......DESC.
00000110  00 00 44 41 54 41 08 00 00 00 00 00 00 00 00 00  ..DATA..........
00000120  44 4E 41 4D 11 00 00 00 00 00 00 00 00 00 00 00  DNAM............
00000130  00 00 00 00 00 00 00 43 4E 41 4D 01 00 00 42 4F  .......CNAM...BO
00000140  4F 4B 89 00 00 00 00 00 00 00 06 08 00 FD 00 00  OK‰..........ý..
00000150  00 00 2F 02 00 00 45 44 49 44 16 00 54 65 73 74  ../...EDID..Test
00000160  42 6F 6F 6B 31 44 55 50 4C 49 43 41 54 45 30 30  Book1DUPLICATE00
00000170  30 00 4F 42 4E 44 18 00 00 00 00 00 00 00 00 00  0.OBND..........
00000180  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  ................
00000190  4F 44 54 59 04 00 00 00 00 00 46 55 4C 4C 02 00  ODTY......FULL..
000001A0  4D 00 46 4C 4C 44 04 00 01 00 00 00 44 45 53 43  M.FLLD......DESC
000001B0  01 00 00 44 41 54 41 08 00 00 00 00 00 00 00 00  ...DATA.........
000001C0  00 44 4E 41 4D 11 00 00 00 00 00 00 00 00 00 00  .DNAM...........
000001D0  00 00 00 00 00 00 00 00 43 4E 41 4D 01 00 00 42  ........CNAM...B
000001E0  4F 4F 4B 7D 00 00 00 00 00 00 00 06 08 00 00 00  OOK}............
000001F0  00 00 00 2F 02 00 00 45 44 49 44 0A 00 54 65 73  .../...EDID..Tes
00000200  74 42 6F 6F 6B 31 00 4F 42 4E 44 18 00 00 00 00  tBook1.OBND.....
00000210  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00  ................
00000220  00 00 00 00 00 4F 44 54 59 04 00 00 00 00 00 46  .....ODTY......F
00000230  55 4C 4C 02 00 46 00 46 4C 4C 44 04 00 01 00 00  ULL..F.FLLD.....
00000240  00 44 45 53 43 01 00 00 44 41 54 41 08 00 00 00  .DESC...DATA....
00000250  00 00 00 00 00 00 44 4E 41 4D 11 00 00 00 00 00  ......DNAM......
00000260  00 00 00 00 00 00 00 00 00 00 00 00 00 43 4E 41  .............CNA
00000270  4D 01 00 00                                      M...
```

This plugin contains three `BOOK` records that override records defined in three masters:

- The record with FormID `FE000806` gives a book the title `S`.
- The record with FormID `FD000806` gives a book the title `M`.
- The record with FormID `00000806` gives a book the title `F`.

Based how it works for previous games, you'd expect `00000806` to override the record defined in `Blank.full.esm` and the other two records to be new records.

As you may be able to guess, what's happening is that `Blank.medium.esm` is a medium plugin, so its overridden record is given the mod index `FD00`, and `Blank.small.esm` is a small/light plugin, so its overridden record is given the mod index `FE000`.

If `Blank.medium.esm` was a light plugin, its record would be given the mod index `FE001` (as it appears after `Blank.small.esm` in the list of masters).

If `Blank.small.esm` was a full plugin, its record would be given the mod index `01`, as it appears after `Blank.full.esm` in the list of masters, and if it was a medium plugin then its mod index would be `FD00` and `Blank.medium.esm`'s mod index would be `FD01`.

If the plugin added a new record, that record's FormID would have to start with a mod index that's not used by one of the masters, e.g. it could be `01` to `FC`, `FD01` to `FDFF` or `FE001` to `FEFFF`. At runtime the game replaces the mod index part of the FormID with the plugin's runtime mod index: e.g. if a plugin loads contains a new record with FormID `02051808` and loads in-game at slot `FD01`, the in-game FormID for that record would be `FD011808`. Note that there's not necessarily any link between how the plugin is flagged and the mod indexes of new records in the plugin file.

The big issue is that nowhere in a plugin file does it say what type of plugin each of its masters were when the file was saved. That means that you can't tell which record comes from which master (or if it's new) without first loading all the plugin's masters and checking what type of plugin they are, and then using that information to match FormIDs up with masters.

An obvious knock-on effect of this is that if a plugin is saved with a master and that master's type is then changed, it becomes impossible to resolve its record FormIDs, and everything breaks. There's also what looks like a bug in the Creation Kit that means it's very easy to accidentally change a plugin's type when saving it, without realising that you've done so...

## Load order

Load order in Starfield is largely similar to how it works in Skyrim Special Edition and Fallout 4, but there are a few new behaviours.

- Starfield has no plugins that are hardcoded to always be active and in specific positions in the load order, but all of the official plugins are hardcoded to always be active (I refer to such plugins as being implicitly active): they are `Starfield.esm`, `Constellation.esm`, `OldMars.esm`, `BlueprintShips-Starfield.esm`, `SFBGS003.esm`, `SFBGS006.esm`, `SFBGS007.esm` and `SFBGS008.esm`.
- Although Starfield doesn't come with a `Starfield.ccc`, it's possible to create one and plugins listed there will be loaded as active plugins in the order they're listed, before any plugins listed in `Plugins.txt`. New to Starfield is that it will load `Starfield.ccc` from `My Games\Starfield\Starfield.ccc` if that file exists, and otherwise it will try to load it from the game's install directory (i.e. the same folder that `Starfield.exe` is found in).
- It's possible to activate plugins using the `sTestFile1` through `sTestFile10` ini file properties, but like in Fallout 4, defining any of those properties causes Starfield to ignore `Plugins.txt` and `Starfield.ccc`.

  Starfield has multiple ini files that it can read those properties from, and in order of increasing precedence they are `<install path>\Starfield.ini`, `<install path>\Starfield_<language>.INI` and `My Games\Starfield\StarfieldCustom.ini`, so a property in `StarfieldCustom.ini` will override the same property as it appears in `Starfield.ini`.

  The value of `<language>` is derived from Steam's game settings for Steam installs. It's apparently derived from Windows' preferred language settings for Microsoft Store installs, but I was unable to replicate that when I had a copy of Starfield through Game Pass.
- Starfield doesn't just load plugins from `<game install path>\Data`: if there's a plugin in `My Games\Starfield\Data` with the same filename as a plugin in `<game install path>\Data`, the plugin under `My Games` will be loaded. This only happens if the same filename is present in both folders though: if there's a plugin that's only present under `My Games`, it won't get loaded.
- Any plugins that are active but have no defined load order position (e.g. because they're implicitly active or activated using `sTestFile<N>` and aren't otherwise constrained) are appended to the load order in order of ascending file modification timestamp (so more-recently-modified plugins load later). Unlike all previous games, if two plugins loaded this way have the same timestamp, they're loaded in *ascending* filename order, not descending filename order.
- Unlike previous games, Starfield makes changes to `Plugins.txt` when it loads:
  - Plugins listed in `Starfield.ccc` are inserted at the top of `Plugins.txt`, before any plugins already listed there.
  - After plugins are loaded, any implicitly active plugins that are also listed in `Plugins.txt` will be removed from that file. This happens after any plugins in `Starfield.ccc` are inserted into `Plugins.txt`.

Also, as mentioned earlier, update plugins used to not use up a slot in the load order when active, but that behaviour changed at some point between Starfield's initial release and 1.12.30.0, so they're now no different from full plugins when it comes to load order.

## Acknowledgements

While I've tested everything here myself and stumbled across a lot of it independently, there's also been a lot of great collaboration with others in the modding community. It's helped me cross-check my understanding and to prompt new questions, especially as I've preferred to figure things out through black-box testing of game behaviour while some others have been digging through disassembly, so we've been trying to answer the same questions from different directions.

Talking of disassembly, I only joined the xSE RE Discord server following Starfield's release, and while most of the information being shared there was not related to load order, I'd like to give shout-outs to aers, JonathanOstrus and Robert for sharing some info that was relevant to my own investigations. I'm sure that others also helped, but I can't remember any other names, sorry!

Outside of that Discord server, I'd also like to thank pStyl3, sibir, Silarn (of [MO2](https://github.com/ModOrganizer2/modorganizer)), ElminsterAU (of [xEdit](https://github.com/TES5Edit/TES5Edit)) and Infernio (of [Wrye Bash](https://github.com/wrye-bash/wrye-bash)) for sharing their own findings: we've been collaborating for years, and they've been excellent as usual!
