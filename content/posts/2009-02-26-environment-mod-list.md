---
title:  "Environment Mod List"
date:   2009-02-26
summary: "An overview of the available environment mods for TES IV: Oblivion."
categories:
  - mods
  - modding
  - Oblivion
  - lists
aliases:
  - /mods/modding/oblivion/lists/2009/02/26/environment-mod-list.html
params:
  toc: true
---

## Introduction

There are a fantastic variety of mods out there that change the environment. This list/comparison is my attempt to bring together up-to-date information on all the most popular/highly recommended of such mods. It was brought about due partly to Dev Akm's work on  [TOTO](http://devnull.sweetdanger.net/obliviontextureoverhaul.html), which was a great inspiration, partly due to the success of bg2408's mod lists/comparisons, and partly due to my realisation that there was no definitive place where newbies and seasoned mod users alike could go for information regarding environment mods.

The mods listed here do not add any new items or objects to the game, they do not change the landscape around you, they are not simply texture replacers. What they do do is change bits of the game to give it a different atmosphere. Many players will find that they do not need a mod to change an aspect listed here, and that is to be expected - the need for such mods is personal.

In order to make sense of the huge amount of variety out there, I will be dividing these mods into several aspects: weather, lighting, water, lava, sound, distant objects and other. The mods listed will be limited to the most popular, most highly recommended and 'best', where 'best' means 'in terms of providing the lowest performance hit, simplest and most compatible solution to fixing a problem'. Where a mod's function causes it to be applicable to several aspects, I will add it to the aspect it most affects.

Within each section, there will be a comparison between conflicting mods, with the differences in approaches outlined, so that the user can choose armed with the knowledge of what each mod does. The brackets after a mod's name will contain that mod's acronym or more popular name.

This list is by no means exhaustive, though I do seek to cover most applicable mods here, and though I shall try to be objective in my approach to them, I can give no guarantees. If you think that a mod has been miss-represented, missed out, or you wish to add something more to this list, please contact me.

## Weather Mods

With only 7 different weathers available in vanilla Oblivion, some players find there is not enough variety in the game's weather system, and seek to add more weathers and more types of weathers into their games. Others wish to see more meteorological effects, a more detailed approach to weather in Oblivion, or just to see some immersion-breaking weather behavior fixed. Whatever the reason, weather mods have been around for a while, and have proved to be very popular amongst mod users. Below is a list of the most popular and most recommended, to help those interested.

Please bear in mind that only one of the first five mods can be used at any one time.

### Natural Weather (NW)

This is part one of four of the [Natural Environments](https://www.nexusmods.com/oblivion/mods/2536) suite by Max Tael. It was the first big weather mod, and the first to try controlling the weather in a new way through a weather script which gives the mod basic seasonal weather. It adds about 40 new weathers to the vanilla selection, improving variety. It also comes with options for darker nights, and texture replacers for night skies, sun and moons, as well as new textures for the new weathers, and new precipitation effects.

However, the scripting has a number of bugs, so the plugin for it should be replaced by Ryu Doppler's [fixed version](https://www.nexusmods.com/oblivion/mods/14918). One very noticeable difference between this and AWS is that this has a yellow tint to its weathers, and AWS has a blue tint to its weathers. There is a mod available that reduces the yellow tint, [Natural Environments Colour Override](https://www.nexusmods.com/oblivion/mods/5433).

### [Atmospheric Weather System (AWS)](https://www.nexusmods.com/oblivion/mods/6730)

Continues in the same vein as NW. It also affects weather in the Shivering Isles with 60 new weather types for the region, and about 40 new weathers for Tamriel. It too features a weather script, and with much greater success, that provides seasonal weather to the user. AWS is widely supported, with several brighter/darker nights tweaks available. It attempts to fix the 'nuclear dawn' caused by HDR in Oblivion, and includes a large number of high quality sky textures for its new weathers. Because of the stability of the mod and the higher quality of the weathers, AWS is often seen as of a higher quality than Natural Weather.

AWS also includes an optional plugin that contains some water changes. If you decide to use this, bear in mind that this then means that you cannot use any of the water mods listed in their section below. One very noticeable difference between this and NW is that this has a blue tint to its weathers, and NW has a yellow tint to its weathers.

### [Arthur's Natural Environments (ANE)](http://www.strategyinformer.com/pc/theelderscrollsivoblivion/mod/23343.html)

This mod attempts to combine AWS and NW's weathers in a new weather script, tweaking the weathers to make them more similar. It lacks NW's texture replacements, but expands upon the weathers available by adding more windy versions of all the weathers. It does not affect the Shivering Isles.

Unfortunately the mod has some issues with bugs and stability, and is very difficult to remove, and this has resulted in it not being very popular. It is important to note that while it contains weathers from AWS and NW, it is not compatible with mods that claim AWS/NW compatibility unless compatibility is also stated for it specifically.

### [Enhanced Weather (EW)](https://www.nexusmods.com/oblivion/mods/16544)

Made by the author of AWS, this mod goes in a new direction. Instead of overhauling the weather system with a large number of new weathers and a heavy script, EW aims to enhance the vanilla system, adding around 30 new weathers, and using a lightweight script that more 'injects' the new weathers into the vanilla system than takes control of everything. The result is that it 'just feels right'. To enhance the user's ability to enjoy an immersive system, EW comes with several optional features that are user configurable. These features require  [OBSE](https://obse.silverlock.org/) to work, though the main weather mod does not. It includes the HDR tweaks and Shivering Isles support of AWS, but is compatible with water mods. Its script codes for a seasonal and regional weather system, and its optional features allow users to change night light levels, colour tints and the speed of weather transitions among others.

Enhanced Weather comes in a modular format, allowing you to choose where you want it to apply its weather changes: only Tamriel, only the Shivering Isles or Tamriel and the Shivering Isles. This grants it some flexibility, allowing the user to choose another weather mod for Tamriel while retaining Enhanced Weather's SI changes, as well as catering for those without SI and those wanting a full Enhanced Weather setup.

### [All Natural (AN)](https://www.nexusmods.com/oblivion/mods/18305)

All Natural can be regarded as the 'FCOM' of environment mods, as it combines a new seasonal and regional weather script with tweaked versions of all the weathers from all the other weather mods, while integrating them with custom versions of Natural Interiors and Real Lights. Because of its large scope, I shall explain each part in turn:

1. At the core of All Natural is its unique weather system. This uses the weather script mentioned above to keep the weather in sync while interior/exterior switching and fast travelling, and to integrate all the weathers from Natural Weather, Atmospheric Weather System and Enhanced Weather. It is modular in nature, allowing you to select which combination of weathers from Natural Weather, Atmospheric Weather System and Enhanced Weather you would like to use alongside the vanilla weathers, ranging from none of them to all at once, resulting in a variety of weathers that is unmatched, ranging from the 7 vanilla weathers to almost 120 weathers from all three integrated mods. There is also a variety of optional features that enable you to customise such things as the darkness of your nights, the speed of weather transitions and the colour tints of the weathers you have selected.

2. Tied closely to the weather system is the Natural Interiors part of All Natural. This has been improved greatly upon the original to cover all the weathers possible, and allows you to experience weather effects indoors, through lighting and sound. The windows of these interiors were also made transparent, allowing you to see the sky through them, which will match the sky in the exterior. The lighting levels will change throughout the day as they do outside, making the interior evironment as truly dynamic as the exterior one. This allows you to see such things as sunsets and the night sky from inside, greatly increasing the immersion and atmosphere of the game.

3. Last, but not by any means least, there is the Real Lights section of All Natural. This is built off the original Real Lights listed below, but improves it greatly by removing the savegame bloating issues it had and fixing many bugs left unfixed in the original. It also continues to expand Real Lights into places where the original did not touch. This part of All Natural is standalone, meaning you can use it without having to use any other parts of the mod. Because of this, and the vast number of improvements over the original, I recommend that you use this instead of the original Real Lights.

All Natural also includes support for the Shivering Isles. This consists of a weather system that highlights the split dual natures of the Isles, and expands the weather types available with around 60 new weathers from Enhanced Weather. The Natural Interiors concept has also been extended to cover the Isles, supplying a greater atmosphere within the interiors there.

The original mod was created by Chong Li, and can be found  [here](https://www.nexusmods.com/oblivion/mods/16490). It was however abandoned at version 0.6, and since then Arthmoor and I have updated it, with the texturing and modelling done by Brumbek, and as the latest version contains everything the previous versions did, but with more features and bug fixes, it is recommended over older versions. All Natural requires [OBSE](https://obse.silverlock.org/) v18 and [Wrye Bash](https://www.nexusmods.com/oblivion/mods/22368) to run. Highly recommended is [Immersive Interiors](https://www.nexusmods.com/oblivion/mods/34199), which expands upon All Natural's interior effects, allowing you to see surrounding buildings and streets out of the windows of interiors in cities, though it is unfinished.

### [Rainbows In Tamriel](https://www.nexusmods.com/oblivion/mods/8927)

This is compatible with all weather mods, and adds pretty rainbows to the world. The chance of one forming is based on the weather, just like with a real rainbow. That's it really.

## Lighting Mods

The mods in this section deal with changing aspects of vanilla Oblivion's lighting, be it interior, exterior or dungeons. Again, many find that the vanilla approach to lighting was not good enough, more so than the weather, and several mods have attempted to remedy this. However, due to the complexity of lighting in oblivion, such game-changing work is long and hard, and so few have made it to completion, or anywhere close. Below is listed those which I have seen to be popular, or at least in people's load order.

The first four mods (Interior Light, Lights Out, Sunlit Interiors, Natural Interiors) should not be used together, as they all overlap, changing the same things. The same is true for Illumination Within, Texian's Window Lighting System and Animated Window Lighting System and Chimneys.

### [Interior Light](https://www.nexusmods.com/oblivion/mods/7162)

This changes interiors to be dark during rain and at night, and light in the day. It also switches on and off interior light sources depending on the time of day. However, this mod has not been updated since its upload in September 2006, and so is not recommended, there is a better alternative, Natural Interiors.

### [Lights Out](https://www.nexusmods.com/oblivion/mods/4893)

Modifies interiors so that they switch off at 7 PM and on again at 7 AM. That's all. This is incompatible with Interior Light, Sunlit Interiors and Natural Interiors.

### [Sunlit Interiors](https://www.nexusmods.com/oblivion/mods/3334)

Modifies many interiors so that their lighting is affected by the time of day, during the day the interiors are bright and during the night they are darker. Superseded by Natural Interiors. This is not compatible with Interior Light.

### [Natural Interiors (NI)](https://www.nexusmods.com/oblivion/mods/6249)

This changes the lighting and sounds in interiors depending on the weather. The windows also light up and dim depending on the weather outside. This is superior to the above mod, and is compatible with AWS and NW, though not with any other weather mod. However, it was abandoned a long time ago, and never got out of beta status, being unfinished in a number of areas.

An updated version can be found integrated into All Natural, which I recommend using instead if you are not already using another weather mod.

### [Real Lights (RL)](https://www.nexusmods.com/oblivion/mods/10891)

Overhauls the lighting system of Oblivion. This removes most of the fake lights to be found and replaces them with real ones instead. As well as this, it also adds time-of-day dependent lights to interiors and overhauls the lighting inside Alyeid ruins. This is all then controlled by a series of master scripts.

This mod greatly increases the immersiveness of the game, but has some downsides. There is quite a large performance hit to the mod, and it is not modular, so it affects interiors and exterior lighting, causing some other mods to have odd lighting as it modifies interiors they use. Also, the various scripts that control the lights have a number of bugs, and the mod has many unnecessary references which create compatibility problems with other mods. There is also a serious issue of savegame bloating, which can cause savegames to increase dramatically in size, causing excessively long loading times, random crashes and even savegame corruption in extreme cases.

Despite the various problems, I still would recommend this mod. However, I would strongly advise you to use the updated version contained in All Natural, as it fixes the various problems listed above, even reducing the performance hit slightly. The version in All Natural can be used on its own, so even if you already use another weather mod, you can use the updated version of Real Lights.

### [Illumination Within (IW)](https://www.nexusmods.com/oblivion/mods/3700)

A popular mod that adds an immersive and complex exterior lighting system to Oblivion. It adds new meshes and textures to windows, as well as lighting changes managed by a script to give buildings lit windows at night. The windows are all controlled by a script that has them all on a complex schedule, and the mod also adds shutters to the windows.

The original mod was unfinished and was very dirty, so Stryfe released an updated version, [Illumination Within Revived](https://www.nexusmods.com/oblivion/mods/4954), which finished it, cleaned it up and made it modular.

However, this version had a very large performance hit, so Martigen released [Illumination Within Revived Optimised](https://www.nexusmods.com/oblivion/mods/6244), which was a series of replacement plugins for IWR that reduced the performance hit.

To get windows to display IW effects, the new meshes and textures had to be applied manually, which took a lot of time, so there were still some buildings not done, and mod added buildings were not affected, so  [Illumination Within Revived Retrofitted](https://www.nexusmods.com/oblivion/mods/11027) was released, which made it easier for modders to add IW support. Unfortunately, this has not been very popular, and still carries a large performance hit.

Due to the performance hit this mod carries, it is recommended to use the Animated Window Lighting System and Chimneys mod instead.

### [Texian's Window Lighting System (TWLS)](https://www.nexusmods.com/oblivion/mods/7055)

Created as an alternative to IW, this does the same thing, but looks very different as it uses different textures and does not have any schedule system. Because of this, it also has less of a performance hit, but the AWLSaC is still recommended instead. If you choose to use this, make sure to grab the fix  [here](https://www.nexusmods.com/oblivion/mods/7060) too.

### [Animated Window Lighting System and Chimneys (AWLSaC)](https://www.nexusmods.com/oblivion/mods/19628)

This mod does the same this as both IW and TWLS, but does it in a new way. Instead of using scripts to swap textures and switch on lights, it uses animated textures that can be toggled between a lit and unlit state through a simple script. This means that it has no performance impact, and it affects all buildings automatically. The plugins require  [OBSE](https://obse.silverlock.org/), and provide a script just as effective as IW's, but with no cost to performance. It is also configurable, as you can choose from a wide variety of textures to use, including the ones from IW and TWLS, and it also comes with an addon that makes the chimneys of houses smoke, with the amount of smoke dependent on the weather and season and time. This is a very highly recommended mod - it has very good features and literally has no downsides.

### [Cities Alive At Night](https://www.nexusmods.com/oblivion/mods/11434)

This mod lights up the cities at night when veiwed from beyond the city walls, whereas the previous mod work from inside the city. It adds a bit of immersion to the cities. Note that this is not needed if you use  [Open Cities Classic](https://www.nexusmods.com/oblivion/mods/16360) or  [Better Cities](https://www.nexusmods.com/oblivion/mods/16513), as AWLSaC will work with them to give the same effect. This mod is compatible with the other lighting mods.

It should be noted by readers though that the recommendation in the readme for this and on its TES Nexus page that the fLightLOD2 parameter in the Oblivion.ini should [b]not[/b] be followed. This tweak has been shown to make green and red coloured blobs appear on distant structures, and the likelyhood of this occuring is increased if you also use a VWD with this tweak.

### Darker Dungeons

This mod removes the ambient lighting from dungeons, which makes them pitch black in areas without a light source. This is a great improvement to immersion and is compatible with everything. Combine with Real Lights for an unparalleled dungeon experience. Remember to load it late in your load order for it to work properly. You can find it in the  [Darker Dungeons and Nights Mod Pack](https://www.nexusmods.com/oblivion/mods/14118). It only affects dungeons found in vanilla Tamriel, so does not affect Oblivion Realm, SI, DLC dungeons, or any mod added ones (though these are generally lighted to suit the mod's atmosphere, so don't need it). Because of this, I recommend using Let There Be Darkness instead.

### [Let There Be Darkness (LTBD)](https://www.nexusmods.com/oblivion/mods/22819)

A newer mod that improves upon Darker Dungeons. It does the same thing, but also makes fog in dungeons black, and affects Oblivion Realm, SI, Knights Of The Nine and Mehrune's Razor dungeons too, all of which are big pluses. The fog change means that you won't get fog shining in the darkness anymore. It also modifies a few of the dust cloud dungeon effects to stop them glowing in the dark, although this also makes them invisible. This is recommended over Darker Dungeons.

There is also a separate expansion to the mod's premise available, entitled  [Let There Be More Darkness](https://www.nexusmods.com/oblivion/mods/29692), which extends LTBD to a variety of popular mods.

### [Cava Obscura (CO)](https://www.nexusmods.com/oblivion/mods/35099)

Another alternative solution to bright dungeons, made by myself. Like LTBD, it affects both ambient and fog lighting and it includes the same mesh replacements. However, while Darker Dungeons and LTBD totally remove ambient and fog lighting, Cava Obscura lowers it to 10% of the original levels. The result is barely noticeably brighter, but Oblivion handles a little light better than total darkness, and so the diffusion of light from sources can seem a bit more dynamic. Again like LTBD, this supports Tamriel, the Oblivion Realm and SI. It also takes a page from LTBMD's book and supports a large variety of mods, including nearly all of those supported by LTBMD and many more.

### A Note On Darker Nights

There are several mods available that alter the night light levels of Oblivion, but remember that they are not compatible with any weather mods, unless they are made specifically for one. To get darker nights with a weather mod, either use the included solution or a mod that states it is specifically for the weather mod you use. The two best options for vanilla Oblivion are Darker Nights, which is included with Darker Dungeons in the  [Darker Dungeons and Nights Mod Pack](https://www.nexusmods.com/oblivion/mods/14118), or  [Original Color Darker Nights](https://www.nexusmods.com/oblivion/mods/4135), which is not as dark, and retains the vanilla blue tint at night.

## Distant Object Mods

VWD mods are the solution to buildings or structures suddenly popping into view as you move through Cyrodiil. There have been a large number of these mods, ranging from those that add very few things to your distant view, to those that add just about everything there is to be seen. The performance hit for these mods also vary, and while the general rule of less added = more performance should hold true, advances in understanding of what gives the biggest performance hits and how to counter that means that there are a few exceptions.

Again, there are a few mods missing from this list in the interest of brevity, but those missing can (and most likely should) be replaced by one of those listed. I shall list the mods in order of least added to most added to distant view.

Only one of the mods in this section should be used at any one time.

### [Tamriel VWD](https://www.nexusmods.com/oblivion/mods/6403)

Adds 40 locations to be seen in the distance, including Cloud Ruler Temple, inns, settlements, Aylied ruins, fort ruins and the Deadric shrines. This is quite an old mod, so the performance hit is much worse than it should be as it uses original unoptimised textures. I recommend using RAEVWD instead.

### Almost Everything Visible When Distant (AEVWD)

*This mod is no longer available, but is retained in this list for completeness.*

Adds a lot more stuff than Tamriel VWD, and uses very low resolution textures in an attempt to reduce the performance hit. However, this results in some graphical anomalies, and the textures may look out of place, so the next mod is more popular. If you want to use this, be sure to grab the  [fixes](https://www.nexusmods.com/oblivion/mods/18268). I still recommend using RAEVWD instead though.

If you use Texian's Window Lighting System, you might want to add  [Illuminated AEVWD](https://www.nexusmods.com/oblivion/mods/11232) after that to extend Texian's system to distant cities.

Alternatively, if you use Illumination Within, you can get  [Illuminated VWD Brumbek Textures](https://www.nexusmods.com/oblivion/mods/20138) which will do the same thing with modified Illumination Within textures.

### Tamriel VWD Enhanced

*This mod is no longer available, but is retained in this list for completeness.*

Picks up where Tamriel VWD left off, adding everything that AEVWD did and more, but instead of using low resolution textures, it uses whatever textures the user has installed. This means it doesn't suffer from the same graphical bugs, but as the author states, no attempt was made to optimise it, so it gives you worse performance than the previous two mods. The performance hit will vary, being very large if you use a high-resolution texture pack such as  [Qarl's Texture Pack III](https://www.nexusmods.com/oblivion/mods/18498), or being smaller if you stick to vanilla meshes. Again, I still recommend using RAEVWD instead though.

### [Really AEVWD (RAEVWD)](https://www.nexusmods.com/oblivion/mods/20053)

The latest and most successful attempt at distant viewable objects with a reduced performance hit. RAEVWD compounds the resources from several sources to give the most complete VWD solution yet. As well as this, it also goes a lot further in optimizing the textures and meshes used so that there is a lot less VRAM usage, which translates to a much reduced performance hit. I recommend using this mod over the others. It shows more than all the previous mods, and gives better performance.

This mod also has several texture packs available to choose from depending on whether you are using different texture packs or not, and it also affects the Shivering Isles. It includes the illuminated windows at night that the AEVWD expansions have.

### [More Than AEVWD (MTAEVWD)](http://www.strategyinformer.com/pc/theelderscrollsivoblivion/mod/17959.html)

This is it. The big one. It pushes Oblivion's rendering engine to the maximum in an effort to make the distant view just as detailed as the near view. To do this, it adds just about everything, down to the rocks, to your distant view at whatever texture detail you're using. Not only this, but it uses the full sized meshes too, so that the models are as fully detailed as those right next to you. This means that this will kill all but the very, very best setups available, and the problem will only get worse if you use a high resolution texture pack such as  [QTP3](https://www.nexusmods.com/oblivion/mods/18498). One thing that I have to say is that it does make Oblivion look fantastic though. This is one to use if you live your life in screenshots. Otherwise, use RAEVWD instead.

### A Note On [TES4LODGen](https://www.nexusmods.com/oblivion/mods/15781)

TES4LODGen is a brilliant utility that will search through the mods you have active and generate DistantLOD data for all the things that need it. This allows those things to show up in the distance in game. It should be used in conjunction with a VWD mod for maximum benefit.

## Water Mods

These mods change the water types in Oblivion to suit several different tastes. As such, there is no 'best' mod for this section, unlike in the Distant Objects section.

Note that only one of the following mods can be used at any one time. The water changes in AWS are not included in this list, but that plugin still follows the same rule: if you use AWS's water plugin, you cannot use any of the mods below, and vice versa.

For this section, my descriptions will probably be not much good. You can get a better example of what the mod is like by clicking the link and checking out its screenshots. Unfortunately, a number of the screenshots were taken by someone using low graphics, so there are no reflections and the water therefore looks horrible. In some cases these are the only screenshots available, and the only solution is to try out the mod for yourself.

### [Advanced Water Modification](https://www.nexusmods.com/oblivion/mods/2734)

Uses maths to calculate more realistic water. Increases view distances underwater, decreases surface opacity slightly. The water reflects the colour of the sky better. Apparently it looks a bit like Far Cry's water.

### [Better Imperfect Water](https://www.nexusmods.com/oblivion/mods/2168)

Increases view distance underwater, water opacity and water reflectivity to give water clearer than vanilla, but not as clear as some other water mods.

### [Better Water](https://www.nexusmods.com/oblivion/mods/1830)

Increases view distance underwater, water opacity and water reflectivity to give water clearer than vanilla. The water is now a light blue colour both above and under it. You can see the bottom of the Niben Bay from the surface.

### [Blue Lagoon Water](https://www.nexusmods.com/oblivion/mods/2032)

As the name suggests, this mod changes the water to a blue colour, and almost completely gets rid of underwater fog, so you can see for a large distance underwater. Strangely enough, it doesn't really change how it looks from the surface though.

### [Clear Water](https://www.nexusmods.com/oblivion/mods/3763)

Turns the water a very bright pale cyan both above and below the water. Increases the fog distance just as much as the above mod.

### [Enhanced Water](https://www.nexusmods.com/oblivion/mods/8011)

Comes with High Definition and Normal Definition plugins. The plugin you use depends on the water detail you use in your game settings. This tries to fix the really unrealistic water that other mods give the game, while balancing it with an improvement upon the vanilla water. It also has an  [add-on](https://www.nexusmods.com/oblivion/mods/17345) for the HD version that affects the Shivering Isles.

[Enhanced Water HDMI](https://www.nexusmods.com/oblivion/mods/23064) combines the original HD plugin with the Shivering Isles addon, and greatly increases underwater visibility distances so they are similar to Better Water values.

### [Improved Water](https://www.nexusmods.com/oblivion/mods/12763)

Changes the look of water in Tamriel and the Shivering Isles. There's not much more to its description, so just check out its screenshots.

### Natural Water

The water mod part of the  [Natural Environments](https://www.nexusmods.com/oblivion/mods/2536) suite by Max Tael. Adds transparency to the opaque water surfaces, changes underwater view distance and improves water reflections.

### [Phinix Waterfix](https://www.nexusmods.com/oblivion/mods/6680)

Modifies the water to look like how it did when the author went swimming somewhere. Goes for realism along the lines of Enhanced Water, Improved Water and Advanced Water Modification.

### [Real Water](https://www.nexusmods.com/oblivion/mods/3082)

Like blue lagoon water in colour, except it also changes the surface colour. It improves sky reflections, and only changes underwater view distance slightly.

## Lava Mods

While not as heavily modded as water in Oblivion, perhaps due to the lack of bathing opportunities, and the inherent risks of the areas in which lava is found, there are still a few lava mods out there, and all of them certainly of high enough quality to be mentioned.

However, a number of them are purely texture replacers, and so as to not break my own rules, I will not cover them here. Below are the mods that don't just give lava a pretty face, but changes how it acts too.

### [Koldorn's Improved Lava 2](https://www.nexusmods.com/oblivion/mods/8786)

The second version of his lava mod, it improves upon his first greatly. It replaces the texture of the lava so that it looks better, and also changes the settings of the lava state for a better, more fluid visual effect that the vanilla lava was clearly lacking.

### [Real Lava](https://www.nexusmods.com/oblivion/mods/6854)

This mod uses textures   from US Geological Survey photography of lava to give a more realistic image. The texture is high resolution, and adds much more detail. It too tweaks some of the visual settings of the lava to make it seem more realistic.

### [Visually Realistic Lava](https://www.nexusmods.com/oblivion/mods/9820)

This mod retextures lava to appear more realistic, and unlike the other mods it adds a new heat effect to the lava to make it seem as though it really is molten and not a pool of oddly coloured water.

## Sound Mods

These mods will alter Oblivion's ambiance through the changing of existing sounds and the addition of new sound effects. There are no music replacers, only environment changing sound mods.

The first mod can and should be used with any of the others you choose to install. The next three mods (Better Storms & Weather, Weather Inside, Storms Lightning Sounds) can then only be used one at a time, and the same goes for Atmospheric Oblivion and Audia Arcanum.

### [Oblivion Stereo Sound Overhaul (OSSO)](https://www.nexusmods.com/oblivion/mods/5861)

This enhances many of Oblivion's ambient sounds, adds new sounds and expands upon them with expanded dynamics, cleaner sound, fixes and many other effects. There is no plugin for this, but it is highly recommended as a start to overhauling the sounds in Oblivion, giving you a better baseline to work from. Make sure to install this before any other sound mod.

### [Better Storms & Weather (BS&W)](https://www.nexusmods.com/oblivion/mods/6306)

This builds upon OSSO by further tweaking its sounds to give better effects during storms. It also includes integrated versions of PJs Lightning Strikes During Storms and More Immersive Sounding Weather, which add in lighting strikes to storms and even better weather sounds respectively. It is not compatible with any weather mods. Make sure to install this after OSSO, and if you use it make sure not to use any of the included mods separately.

### [Weather Inside (WI)](https://www.nexusmods.com/oblivion/mods/4939)

This mod lets you hear weather sounds while you are indoors, greatly improving immersion, as no longer do you walk in from a storm to find all trace of its existence outside gone.

[Weather Inside [seasons]](https://www.nexusmods.com/oblivion/mods/5095) expanded upon this concept, improving the quality of sounds used, and adding in variations to the sounds depending on the season. It also reworks the original sounds to be more seamless, and improves upon the mod's scripting to make it more realistic. This is incompatible with Natural Interiors, as that already includes the same functionality.

### [Storms Lightning Sounds (Storms & Sounds, S&S)](https://www.nexusmods.com/oblivion/mods/8711)

This is the culmination of weather effect mods, combining BS&W with Weather Inside and changes them to give better lightning effects, less performance hit, modularity to choose what you want. It is compatible with every weather mod there is, with plugins for many of them, and an OBSE requiring plugin that is compatible with them all. I highly recommend this as a sound effects mod. It should be noted that while Weather Inside is incompatible with Natural Interiors, S&S is compatible and can be used alongside it.

### [More Immersive Sound (MIS)](https://www.nexusmods.com/oblivion/mods/5487)

A great mod that alters the sounds used in game for different areas resulting in more variety and a more seamless gameplay experience. It is compatible with the above mods, provided that you load it before any other sound altering mod.

An updated version by Brumbek,  [More Immersive Sound Edited](https://www.nexusmods.com/oblivion/mods/19038), improves upon the quality of the sounds in MIS, tweaking them and removing some of the less immersive sounds. It also makes some of the sounds 3D positioned.

### [Atmospheric Oblivion (AO)](https://www.nexusmods.com/oblivion/mods/7703)

A great mod for atmosphere, it adds a whole host of new ambient sounds to the environment around you depending on your location. It will add the sound of birds while you walk through the forest, crumbling stonework as you explore ruins and the sound of howling and groaning monsters from below when you delve into dungeons. It has  [a number of patches](https://www.nexusmods.com/oblivion/mods/12339) to make it work with other mods.

If you get this, also be sure to grab the  [update patch](https://www.nexusmods.com/oblivion/mods/19487) for it.

### [Audia Arcanum (AA)](https://www.nexusmods.com/oblivion/mods/9218)

Overhauls all sounds in the game, expanding upon AO and adding more high quality sounds. If you use this, you don't need AO as it is included. However, due to the fact that it changes all sounds, including menu sounds, it may not be to your liking. If you use it, be sure to get the  [update](https://www.nexusmods.com/oblivion/mods/13555).

AA also has an  [expansion](https://www.nexusmods.com/oblivion/mods/20628) that greatly improves the quality and diversity of the footstep noises in Oblivion.

### [Symphony Of Violence](https://www.nexusmods.com/oblivion/mods/13987)

This is a tweaked compilation of combat sounds from  [Combat Sounds 300](https://www.nexusmods.com/oblivion/mods/10345), Walther's Oblivion Combat Sounds and Improved Bow Sounds. It replaces the vanilla combat sounds with higher quality counterparts, which are clearer, more detailed and have much more variation. It also enhances the different sounds you hear when different materials are hit. This mod greatly enhances the immersiveness of combat. Though it is still in beta, this is not due to any bugs, but the author's desire to do more with it in the future.

### [Ambient Town Sounds](https://www.nexusmods.com/oblivion/mods/13009)

Adds various ambient sound effects to the towns and cities of Cyrodiil, making them actually seem as alive as they should. It has separate effects for day and night, and provides the IC with its own sound set.

If you want to use this mod, get Brumbek's  [Ambient Town Sounds Edited](https://www.nexusmods.com/oblivion/mods/14344), which fixes a few bugs in the original, including the strange addition of the AOL AIM alert to some of the sounds and some other immersion breaking sounds. It also balances the volume of the sounds so that they blend in better to the background.

### [Echo's Chapel Chant](https://www.nexusmods.com/oblivion/mods/14868)

Adds Gregorian chanting as ambient sound to the chapels of the seven cities, excluding Kvatch. The sounds are recordings taken from real Gregorian chants, and are of a high quality. The sounds blend in very well with the environments of the cathedrals, but the lack of visible chanters may lead to a break in immersion for some players. Nevertheless, it is a high quality addition to your game, and you should not miss out on at least trying it out.

### [Distant Chapel Bells](https://www.nexusmods.com/oblivion/mods/12993)

Combining Morbus's  [Better Bell Sounds](https://www.nexusmods.com/oblivion/mods/5286) and the bell sound effects from Tom Supergan's  [VWD Chapels](https://www.nexusmods.com/oblivion/mods/12351), this mod allows you to hear the peal of chapel bells from outside or inside cities, and in the chapels themselves, excluding Kvatch. With this mod, the sounds are also louder, and so carry further. This is a great improvement over vanilla, which would only allow you to hear bell sounds from inside cities and the chapels, and even then they were quiet and easily missed. It provides a great boost to immersion, in an area which most will have otherwised overlooked.

### [MrPwner's Ambient Churches](https://www.nexusmods.com/oblivion/mods/24622) & [MrPwner's Ambient Inns](https://www.nexusmods.com/oblivion/mods/24602)

Designed to go together, these two mods add ambient sound effects to chapels and inns respectively. The former adds Gregorian chanting similar to the above Echo's Chapel Chant, though it doesn't apply its effects to the Imperial City's Temple as well as Kvatch. Some may prefer Echo's Chapel Chant to this, but be sure to try them both out before making your decision.

The Ambient Inns mod attempts to make inns more lively by adding backround voices and Irish folk music to the majority of vanilla inns. Some may find the additions somewhat immersion breaking, owing to both the lack of speakers for the voices to originate from, with vanilla already providing background conversations for those NPCs present, and the discordancy of the Irish music with the general artistic style of Oblivion, not to mention the lack of a full live band, which the majority of the tracks feature. Still, it is worth consideration, as you may decide that you do like it.

### [Varied Spell Sounds:](https://www.nexusmods.com/oblivion/mods/14799)

This mod differentiates the sound effects for spells, giving each spell a different set of effects, the game a much-needed boost in variety. In vanilla Oblivion, the only variation between sound effects was between the four schools, with the exception of the school of destruction's elemental spells. The changes this mod makes are extended to player-made spells and the majority of mod-added spells, including those made available by the popular  [Midas Magic Spells of Aurum](https://www.nexusmods.com/oblivion/mods/9562). It includes a patch for use with Supreme Magicka, though this may be outdated.

There exist two variations on this excellent mod:  [Quieter Varied Spell Sounds](https://www.nexusmods.com/oblivion/mods/15563), and  [Even Quieter Varied Spell Sounds.](https://www.nexusmods.com/oblivion/mods/19040) These do exactly as their names suggest, and lower the volume of the new effects to better balance with the rest of the game's sounds. The former lowers the volume of the effects by roughly 20%, while the latter lowers them again by a further 10 decibels.

## Other Mods

In this category will go all the various mods that do not fit in the above sections, but are none-the-less very important and popular environmental mods. They can be used alongside any of the above mods unless stated otherwise.

### Natural Vegetation

The third quarter of the  [Natural Environments](https://www.nexusmods.com/oblivion/mods/2536) suite to be covered in this guide, this is considered to be a great bonus to how the environment looks without actually changing much in the world around you. All it does is introduce a bit of variety in the plant life around you by scaling them all differently, but the effect is astounding. For those that find the plants too small, a scaled 200% version which makes everything twice the size is also packaged in Natural Environments.

### Natural Habitat

The final plugin in  [Natural Environments](https://www.nexusmods.com/oblivion/mods/2536), this adds basic wildlife effects in the form of flying birds and insects to the game. These lack AI and collision, as they are merely effects that seek to give a bit of variety to the game. As such, especially with the birds, some may find it slightly odd in that there are always birds flying around high up, but never closer to the earth. Despite that though, it is very popular and does indeed do what it set out to well.

### [Ambient Dungeons (AD)](https://www.nexusmods.com/oblivion/mods/18385)

This mod uses  [OBSE](https://obse.silverlock.org/),  [OBGE](https://timeslip.users.sourceforge.net/obge.html) and  [You Are Here](https://www.nexusmods.com/oblivion/mods/18160), combined with a set of shaders, to apply different effects to your screen such as modifying saturation and contrast. It has presets for several different interior types, giving each type a different atmosphere. These presets are configureable through an ini file so you can change the effect applied. Using this mod you can get some quite stunning effects and the atmosphere of affected interiors is greatly increased.

While this mod may be used to make dungeons appear darker, it is preferable to use Darker Dungeons to do this instead, as AD's effect does not affect the actual game, only what you see, so you are placed at a disadvantage to NPCs who are not affected.

### [Get Wet](https://www.nexusmods.com/oblivion/mods/2909)

This mod makes characters, including the player, appear wet in the rain and after swimming, through the use of a new 'wet' shader that is applied whenever it rains and an optional raindrop effect for added detail and realism.

If you want to use it you should get the  [Get Wet Update](https://www.nexusmods.com/oblivion/mods/10803) which removes the save game bloating that the original had, and fixes a few other visual anomalies.

### [AliveWaters](https://www.nexusmods.com/oblivion/mods/6914)

As the name suggests, this mod adds a lot more life to the underwater landscape of Cryodiil, turning it from a moon-like vista into an environment as vibrant as those on dry land. It adds lots of new stuff to do this, including many more different types of fish, shipwrecks, retextures of seaweeds and new rusty items, along with shipwrecks, treasure, crabs, new fishy alchemy ingredients and much more clutter and different spawns for different areas. A highly popular mod, this can be used with any of the mods on this page, as well as the majority of other mods.

### [Enhanced Vegetation](https://www.nexusmods.com/oblivion/mods/23783)

Similar to Natural Vegetation, this scales all trees and shrubs to new sizes, ranging from the original 100% to 150%. It is also a texture replacer with several resolution options to suit your hardware. It has different plugins to use depending on the timescale you use, so that the grass sway speed stays constant, unlike in vanilla, where grass sway speed changes with timescale. Enhanced Vegetation also affects distant trees, scaling them too, thereby reducing the pop-up that is often experienced using Natural Vegetation. Be sure to only use one of either Natural Vegetation or Enhanced Vegetation, as the two are not compatible.

### [Immersive Interiors](https://www.nexusmods.com/oblivion/mods/34199)

As mentioned earlier, Immersive Interiors is a mod that uses All Natural's interior effects and expands on them to let you see the buildings and features you expect to see outside the windows of city interiors, rather than just a sky in a featureless void. This brings a massive leap in immersion, and though it is still in its early stages of being a Work In Progress, the cities that have been done have been   on to a very high standard, providing an unparalleled experience which will only improve as more is completed. However, while compatibility is not a problem, if you use a mod that alters the city layout, such as Open Cities Reborn or Better Cities, the interior view will not match up with the altered layout, as the work was done with the vanilla layout in mind. As it uses All Natural as a base, that is required.

## Conclusion and Other Resources

That's it for this guide. I hope it helped you to understand the different mods on offer. There are a large number of other mods out there that also affect the environment, but that I did not cover here. To find out more I suggest that you follow the links below and read the lists and guides you find there.

* [Dev Akm's The Oblivion Texture Overhaul](http://sweetdanger.net/x.Archive.devnull/obliviontextureoverhaul.html)
* [Buddah's List of Links](https://www.nexusmods.com/oblivion/mods/4394)
* [Cliffworms' List of Mod Lists](http://forums.bethsoft.com/topic/1010109-list-list-of-mod-lists/)
