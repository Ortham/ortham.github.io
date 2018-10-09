---
title: "My Projects: Game Mods & Code"
permalink: /projects/mods/
---

I've been involved in modding Bethesda's Elder Scrolls and Fallout games since 2007. Thousands of hours later, here's what I've created or contributed to.

### Modding Utilities

#### [LOOT](https://loot.github.io/)

<div class="table-row">
    <img alt="LOOT icon" src="/assets/images/LOOT.png"><p>A plugin load order optimiser for TES IV: Oblivion, TES V: Skyrim, Fallout 3 and Fallout: New Vegas. The successor to BOSS. The core functionality is available in a C++ library.</p>
</div>

#### [BOSS](https://boss-developers.github.io/)

<div class="table-row">
    <img alt="BOSS icon" src="/assets/images/BOSS.png"><p>A plugin load order sorting tool for TES IV: Oblivion, Nehrim - At Fate's Edge, TES V: Skyrim, Fallout 3 and Fallout: New Vegas. This was considered an essential tool by the vast majority of mod users, until I wrote LOOT.</p>
</div>

#### [StrEdit](http://github.com/WrinklyNinja/stredit)

<div class="table-row">
    <img alt="StrEdit icon" src="/assets/images/StrEdit.png"><p>A minimalist TES V: Skyrim string table editor designed for mod translators. </p>
</div>

#### [Wrye Bash](http://github.com/wrye-bash)

<div class="table-row">
    <img alt="Wrye Bash icon" src="/assets/images/Bash.svg"><p>A powerful mod management utility for TES IV: Oblivion and TES V: Skyrim.</p>
</div>

### Documentation

As well as the guides available on this site's blog, I've also written the following.

#### [FOPDoc](https://github.com/WrinklyNinja/fopdoc)

Collaborative documentation for the Fallout 3 and Fallout: New Vegas plugin file formats. *I'm no longer working on this, but I'll still merge pull requests.*

#### [Buddah](https://github.com/WrinklyNinja/buddah)

A simple registry for community-made game modding software, because I found it discovering it difficult.

#### Wiki Contributions

Over the years, I've made various contributions to UESP.net's [plugin file format information](http://uesp.net/wiki/Tes4Mod:Mod_File_Format), the [Elder Scrolls Construction Set Wiki](http://cs.elderscrolls.com/index.php?title=Main_Page) and the [Creation Kit Wiki](http://www.creationkit.com/).

### Libraries

Libraries with C APIs that can be used by mod utility developers to make their lives easier.

#### [esplugin](http://github.com/WrinklyNinja/esplugin)

Read ESP, ESM and ESL files. A Rust library with a C wrapper, used by LOOT and libloadorder.

#### [libloadorder](http://github.com/WrinklyNinja/libloadorder)

Manipulate the load order and active status of plugins for Morrowind, Oblivion, Skyrim, Skyrim SE, Skyrim VR, Fallout 3, Fallout: New Vegas, Fallout 4 and Fallout 4 VR. A Rust library with a C wrapper, though it was written in C++ for a long time. Used by LOOT.

#### [libstrings](http://github.com/WrinklyNinja/libstrings)

Read and write TES V: Skyrim's string table files.

#### [libbsa](http://github.com/WrinklyNinja/libbsa)

Read Morrowind, Oblivion, Skyrim, Fallout 3 and Fallout: New Vegas BSA files. *In limbo: I may turn it into a wrapper for [BSAOpt](https://github.com/Ethatron/bsaopt).*

#### [libespm](http://github.com/WrinklyNinja/libespm)

A basic header-only library for reading ESP and ESM files. Superseded by esplugin.

### Oblivion Mods

Although I no longer create mods for Oblivion, and I've stopped supporting those I have released, here's what I created or contributed to.

#### [Cava Obscura](http://www.nexusmods.com/oblivion/mods/35099)

Darkens all dungeons in the game, and in many popular mods, by 90% to improve immersion and make torches and nighteye useful.

<small>*Cava Obscura* is now licensed under the [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) license. This supersedes the license distributed with the mod itself.</small>

#### [Enhanced Seasons](http://www.nexusmods.com/oblivion/mods/27972)

Brings more variation between the seasons of Cyrodiil using a combination of contrast and saturation changes, seasonal and latitude-based day lengths, and weather volatility changes.

<small>*Enhanced Seasons* is now licensed under the [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) license. This supersedes the license distributed with the mod itself.</small>

#### [Enhanced Weather](http://www.nexusmods.com/oblivion/mods/16544)

Seamlessly blends the default weather system with new photorealistic weathers, and adds climatic and seasonal variation, as well as customisable darker or brighter nights.

I made this together with Halo and HTF, it was my first major modding contribution. Ah, nostalgia...

#### [Weather: All Natural](http://www.nexusmods.com/oblivion/mods/18305)

Combines a robust custom weather system with the weathers from Atmospheric Weather System, Natural Weather and Enhanced Weather, adds exterior weather lighting, sounds and a day/night cycle to interiors, and replaces all fake lighting with real lights from visible sources.

An ambitious mod, started by Chong Li and picked up by Arthmoor, Brumbek and myself, it pushed at the boundaries of Oblivion's capabilities, and I notice Skyrim has interior day/night cycles. `;)`

#### [Oblivion Graphics Extender](http://www.nexusmods.com/oblivion/mods/30054)

An [OBSE](http://obse.silverlock.org/) plugin that adds extra functionality to Oblivion's scripting language, focussed on the implementation and manipulation of graphics effects. It adds support for fullscreen shaders and extra HUD elements, provides information about graphics memory and screen resolution and allows you to clear some of oblivions textures from graphics memory.

I wrote some of the HLSL shaders distributed with OBGE.

#### [Ambient Dungeons](http://www.nexusmods.com/oblivion/mods/18385)

Uses effect shaders to tweak the atmosphere of dungeons and other areas. I updated the mod to work with OBGE, and fixed a few bugs.
