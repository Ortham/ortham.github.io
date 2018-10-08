---
title:  Modding Library Updates
date:   2016-04-30
summary: libbsa, libespm and libloadorder changes & improvements.
---

I've never actually written about my [libbsa](https://github.com/WrinklyNinja/libbsa), [libespm](https://github.com/WrinklyNinja/libespm) or [libloadorder](https://github.com/WrinklyNinja/libloadorder) libraries before, but I've been updating them recently so now's as good a time as any to do so.

## libbsa

[libbsa](https://github.com/WrinklyNinja/libbsa) is a library for reading BSAs and extracting their contents, with the aim of supporting BSAs for Morrowind, Oblivion, Skyrim, Fallout 3 and Fallout: New Vegas. I wrote it for [Wrye Bash](https://github.com/wrye-bash/wrye-bash), so that it could check inside BSA files when performing resource conflict detection between mod packages, and also so that it could detect Skyrim mod translation files when they were present inside a BSA. However, I also defined an API for writing and modifying BSAs, thinking to implement it later, then promptly lost interest.

Fast-forward to 2016, almost three years later, and there is now interest in adding support for Fallout 4's BA2 archives to libbsa. I'd learned a lot about writing good-quality code in the meantime (even if I don't always successfully apply that knowledge), so I decided to give the library a bit of a spring clean. The changes I made include:

* Automating more of the build process
* Adding tests and Travis CI integration
* Simplifying the code by reducing duplication, removing unimplemented API functions and unused data structures, etc.
* Using C++11 to improve readability and remove some Boost library dependencies.
* Standardising the repository layout so that the API header is in an `include` folder.

Unfortunately, while my new tests pass on my Windows development computer, they fail on Travis and my Ubuntu VM due to a zlib buffer error that has me stumped. I'm also aware that the tests don't cover many usage cases, and so I'll need to work on that.

In parallel to this work, @matortheeternal has been writing a CLI wrapper to make it easier for code written in other languages to make use of libbsa, and I'll be merging that in when it's done.

In the future, I'd like libbsa to be more of a wrapper itself: there are other BSA-handling codebases around that provide more extensive support for the BSA (and BA2) file format, and though they're generally undocumented and without tests, it may be better to wrap around them than reimplement the support within libbsa itself.

## libespm

[libespm](https://github.com/WrinklyNinja/libespm) is the Elder Scrolls Plugin (\*.esp) and Elder Scrolls Master (\*.esm) file parser used by libloadorder (covered below) and [LOOT](http://loot.github.io). It's very simplistic, only supporting reading some header fields and record FormIDs, because that's all that is needed of it, but like libbsa the code was a bit gnarly.

Libespm was actually the first of the three libraries that I went back to, shortly after I had TDD drummed into my head at work, and it was the perfect size and scope for a TDD-based rewrite. As part of the rewrite, I used C++ streams instead of array pointer arithmetic, which while slightly slower is a heck of a lot less error-prone and easier to read. I also used memory mapping to reduce the performance hit and added Fallout 4 support along the way, not to mention similar build system improvements and Travis CI integration that I later used for libbsa.

Having tests for just about everything was the biggest improvement, and Google Test's parameterised test support allowed me to run the tests for all the supported games, which gives huge assurance that things are working and, more importantly, catches if and when I break things making new changes.

My intention is to keep libespm focussed on providing plugin parsing for libloadorder and LOOT only, and do not intend to extend it beyond their needs. There are other, more fully-featured, codebases around that could be adapted into libraries with less effort than extending libespm would take to match them. I did consider for a while scrapping libespm entirely and writing such a wrapper instead, but in the end I have a library that does what I need it to, and it would be unnecessary work to switch to something else.

## libloadorder

[libloadorder](https://github.com/WrinklyNinja/libloadorder) is used by LOOT and a few other utilities to handle reading and writing load order for Bethesda's Elder Scrolls (from Morrowind onwards) and Fallout games. In the last 6 months, it's seen:

* hundreds more unit tests added
* the C API turned into a wrapper around an internal C++ API to improve maintainability
* thread safety implemented
* huge performance improvements
* Fallout 4 support added
* build and release automation improvements

Future development will depend on the needs of libloadorder's users and what, if any, changes Bethesda make to Fallout 4's load order system in the future. As things stand, the library is feature-complete, and there isn't much I can think of to improve in terms of code quality (other than splitting the large `LoadOrder` class into `LoadOrder`, `LoadOrderReader` and `LoadOrderWriter` classes).

So there it is: libespm and libloadorder are pretty much where I want them, and libbsa is slowly getting there. No doubt I'll continue to learn more best practices, and come back to apply them to these libraries along with my other projects. In the meantime, I've got plenty to keep me busy!
