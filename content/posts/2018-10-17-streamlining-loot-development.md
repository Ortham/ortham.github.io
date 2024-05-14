---
title:  Streamlining LOOT development
date:   2018-10-17
summary: Rebuilding the LOOT application on top of its library.
aliases:
  - /2018/10/17/streamlining-loot-development.html
---

LOOT has made its core sorting and metadata access functionality available to
other applications through a C++ library since 2015. It used to be something of
an afterthought, a drain on time that could have been spent improving LOOT
itself, but now it sits at the heart of everything LOOT does, and that's made it
a much better library all around.

The library is currently known as the LOOT API, but let's call it **libloot**
here, because "LOOT API" is a terrible name and I should probably change it.
Before early 2017, libloot and the LOOT application (which I'll just call "LOOT"
from now on) lived in the same repository and shared some code in a core library
that they'd both statically link to.

However, there was a lot of duplication outside of that core library, because
libloot and LOOT did similar things in different ways. Typically, because LOOT
offered much more flexibility, it would interact with the core library in more
detail, while libloot would generally stick to simpler interfaces. This meant
that there was a lot of overhead when making changes, and because libloot wasn't
the core "product", there wasn't much incentive to keep its development up to
date with the application's. I wouldn't leave it broken, but if a new feature
was added to the application, I wouldn't necessarily expose it through the API
too.

This wasn't a great position to be in, architecturally or as a project, so I
[decided](https://github.com/loot/loot/issues/753) to rebuild LOOT to go through
libloot instead of just using the core library directly. As the issue tracker
shows, there was a lot that needed changing! The whole process revealed a lot
that needed to be improved in the API, not just about exposing new data access,
but logging, caching and providing functions that would allow efficient data
access patterns.

Once LOOT was happily running on top of libloot, I was able to [split the
repository in two](https://github.com/loot/loot/issues/759), so LOOT now lives
in [loot/loot](https://github.com/loot/loot) and libloot lives in
[loot/loot-api](https://github.com/loot/loot-api). I preserved the full history
in both repositories, as it was both simpler and more representative to do that.
An unforseen side effect of that is that [LOOT's credits
page](https://loot.github.io/credits/) counts my commits until that split twice,
making me look much busier than I am!

With the repositories split, LOOT could depend on libloot as an "external
project" in its CMake config, and download and build it from source. However,
having the clear separation between libloot and LOOT showed that libloot was
about twice as slow to build, and that most changes to LOOT didn't need any
libloot changes, so libloot was a huge bottleneck. To resolve this, I switched
to building libloot DLLs in
[AppVeyor](https://ci.appveyor.com/project/LOOT/loot-api) and publishing them to
[Bintray](https://bintray.com/loot/snapshots/loot-api), so that LOOT could just
download a prebuilt DLL and dynamically link to it.

Some of the benefits of all this work were:

- libloot development has very little overhead and naturally stays in sync with
  LOOT, getting new features when LOOT gets them, if it makes sense for them to
  be a library-level feature.
- Better separation of concerns, libloot and LOOT can focus on backend and GUI
  functionality respectively.
- Much faster CI build times for LOOT, as it can now link to a prebuilt libloot
  DLL, avoiding having to recompile the backend whenever the GUI changes.
- Because libloot bottlenecks LOOT builds less frequently, it can now afford to
  provide x64 builds in addition to x86 builds.
- Because LOOT is now just another libloot client, there's more incentive in
  making libloot actually pleasant to use, so it's seen a lot more refinement.
- The [LOOT metadata validator](https://github.com/loot/metadata-validator)
  was reimplemented on top of libloot, and as it must now use the same
  interfaces as LOOT, there's more assurance that it'll catch issues that LOOT
  would see.
- libloot and LOOT can have separate release cycles, and by being careful about
  ABI compatibility in libloot, it's often possible to just replace the DLL in
  an existing LOOT build. This means it's now much simpler to test backend
  changes in isolation.

Now if only it were possible call C++ from other languages without having to
write wrappers!
