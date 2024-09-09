---
title: Cross-compiling LOOT
date: 2024-09-09
summary: 2024 edition.
categories:
   - LOOT
draft: true
---

Since my [last post]({{< ref "2023-07-30-cross-compiling-loot" >}}) about cross-compiling LOOT, I broke (and recently fixed) cross-compilation, and also made a couple of changes that are worth writing up.

## Toolchain updates

I most recently used [MXE](https://mxe.cc/) commit `c43cd2a53af8a381fa243a8b961bd388898ea951`, libloot v0.24.0 and LOOT v0.24.0.

Since my last post, LOOT updated its OGDF dependency, and as a result the related build failure that I'd previously written about no longer happens. It's also no longer necessary to specify an empty `LIBLOOT_HASH` value, as it'll be left unset by default if you override `LIBLOOT_URL`.

I had to add `CMAKE_PREFIX_PATH` to my CMake toolchain file, as Qt's Network module had a new dependency on a Brotli library that couldn't otherwise be found while building LOOT (it complained about not being able to find `WrapBrotli`).

My updated CMake toolchain file is:

```cmake
set(CMAKE_SYSTEM_NAME Windows)
set(CMAKE_SYSTEM_VERSION 10)

set(CMAKE_C_COMPILER   x86_64-w64-mingw32.static-gcc)
set(CMAKE_CXX_COMPILER x86_64-w64-mingw32.static-g++)

set(CMAKE_FIND_ROOT_PATH "$ENV{HOME}/Code/mxe/usr/x86_64-w64-mingw32.static")
set(CMAKE_PREFIX_PATH "$ENV{HOME}/Code/mxe/usr/x86_64-w64-mingw32.static")

set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)

set(CMAKE_CROSSCOMPILING_EMULATOR wine)
```

(I've changed where `mxe` was cloned, from `$HOME/Downloads` to `$HOME/Code`.)

An update to the Rust toolchain meant that linking the libloot binaries caused a lot of warnings to be logged, like this:

```
Warning: .drectve `-exclude-symbols:"_ZN9hashbrown3raw21RawTable$LT$T$C$A$GT$7reserve17h795ee33db595ffa5E" ' unrecognized
```

This is due to the linker not supporting these `.drectve` entries, as MXE uses GNU ld 2.38, but support for these entries was only added in 2.40, according to [this issue](https://github.com/rust-lang/rust/issues/112368).

## Running tests

The line setting `CMAKE_CROSSCOMPILING_EMULATOR` in my toolchain file above is also new.

I relatively recently enabled the integration between CMake's CTest and Google Test (which is the framework that my automated tests use), using CMake's `gtest_discover_tests()`.

The way that test discovery works is that it runs the test executable once it's built to print out all the tests that exist. Obviously, if you've built a Windows executable on a Linux host, that's a bit of a problem and causes the build to fail. There is an older `gtest_add_tests()` CMake function that discovers tests by scanning source code instead, but it's less robust, so instead of using that I set `CMAKE_CROSSCOMPILING_EMULATOR`, which tells CMake to run executables through the given program (which in this case is `wine`).

That all works great, except for one problem: running through CTest and Wine together is incredibly slow. I had to increase the test discovery timeout as sometimes it takes longer than the default of 5 seconds:

```cmake
gtest_discover_tests(libloot_tests DISCOVERY_TIMEOUT 10)
```

However, it's not just discovery, the tests themselves are much slower when run through CTest and Wine than just Wine. The tests run through Wine are slower than when they're built as a native Linux executable, but the absolute time is still fast enough that it doesn't make a practical difference, it's just when CTest is added on top of Wine that they become unbearably slow.

For running a single test:

| Run | Running time / ms |
|-----|------------------|
| Native | 4
| Native using CTest | 83
| Wine | 939
| Wine using CTest | 5008

The commands used to get those times were:

```sh
# Native
time ./libloot_tests \
   --gtest_color=no \
   --gtest_filter=IsCompatible.shouldReturnTrueWithEqualMajorAndMinorVersionsAndUnequalPatchVersion 

# Wine
time wine libloot_tests.exe \
   --gtest_color=no \
   --gtest_filter=IsCompatible.shouldReturnTrueWithEqualMajorAndMinorVersionsAndUnequalPatchVersion 

# CTest, same for native and Windows builds
time ctest -R IsCompatible.shouldReturnTrueWithEqualMajorAndMinorVersionsAndUnequalPatchVersion
```

Across the whole libloot test suite, it really adds up. When running all 1944 tests:

| Run | Running time / s |
|-----|------------------|
| Native | 2
| Native using CTest | 19
| Wine | 46
| Wine using CTest | 12070

The commands used to get those times were:

```sh
time ctest --quiet

time wine libloot_tests.exe --gtest_brief=1 --gtest_color=no
time wine libloot_internals_tests.exe --gtest_brief=1 --gtest_color=no

time ./libloot_tests --gtest_brief=1
time ./libloot_internals_tests --gtest_brief=1
```

I compared that to running the native test executables directly and through CTest and found that CTest still added a lot of overhead, but it mattered less because the tests were so fast to begin with.

So while it's possible to run the tests through CTest, it's actually better to just run the executables directly.

## LOOT's Installer

I made some changes to the LOOT installer build scripts so that the PowerShell script that downloads unofficial translations for Inno Setup and LOOT's masterlists can now run in Linux, and building the installer itself will now accept the binaries that are created by MinGW-w64 (they have different names and locations, and Qt is statically linked). Inno Setup does need to be run through Wine though.

The built installer also works when run through Wine, but only if you choose the option to install LOOT for all users: if you choose a user-specific install, the installer shows an error about failing to expand the `autopf` constant, I guess because the underlying Windows API is only stubbed by Wine.