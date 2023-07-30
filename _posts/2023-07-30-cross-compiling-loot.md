---
title: Cross-compiling LOOT
date: 2023-07-30
excerpt: For Windows, from Linux
---

[LOOT](https://loot.github.io/) is a utility that helps people use game mods for Bethesda's Elder Scrolls and Fallout games. These games are native Windows applications, and LOOT is released as a native Windows application. However, LOOT's CI includes Linux builds, and over the years there has been some interest in running it as a native Linux application as well as running the Windows build in Linux using [Wine](https://www.winehq.org/).

Early on in LOOT's history I did most of its development on Linux, cross-compiling it for Windows, but at some point before v0.7.0's release I moved to doing the development on Windows and later removed the outdated config and instructions for cross-compiling LOOT.

Fast forward 8 years and I was recently asked about cross-compiling LOOT on Linux for Windows, and decided to try it again. After a *lot* of trial and error, I managed to get a working build, and I've written up the steps for doing so below.

I've specified versions where I can, to improve the reliability of these instructions, but some steps involve installing or building the latest thing, e.g. APT packages, the Rust compiler, and Rust library dependencies. In those cases newer versions shouldn't break anything, but that isn't guaranteed. Where versions have been specified, older or newer versions may also work unless otherwise noted.

## Build environment

I ran the build in Hyper-V VM with the following specs:

- 3 virtual processors (the host CPU is an Intel Core i5-8400)
- 8 GB of RAM
- a 32 GB hard drive

I used Ubuntu 20.04.6's desktop AMD64 [image](https://releases.ubuntu.com/20.04.6/ubuntu-20.04.6-desktop-amd64.iso), and changed the VM's Secure Boot template to "Microsoft UEFI Certificate Authority" to allow it to boot (you could also just disable Secure Boot).

When installing Ubuntu, I chose the minimal install option, to download updates during install, and to install third-party software for graphics, etc. I don't think any of these choices matter for the build, but they're what I'm used to selecting when installing Ubuntu. I might have run out of hard drive space if I didn't choose the minimal install option: at times while figuring out the build process I did run out of space, though after a clean run through all the steps below I was left with 8 GB of free space.

With Ubuntu freshly installed, I then ran:

```
sudo apt-get update && sudo apt-get upgrade -y
```

to make sure the base install was up to date.

## Building tools and dependencies

Cross-compiling is done using the [MinGW-w64](https://www.mingw-w64.org/) runtime environment. Ubuntu 20.04 includes an older version in its APT repositories, based on GCC 9.3, and that might be fine to use, but I built everything from source using [MXE](https://mxe.cc/):

```
sudo apt-get install -y autoconf automake autopoint bash bison bzip2 flex g++ g++-multilib gettext git gperf intltool libc6-dev-i386 libgdk-pixbuf2.0-dev libltdl-dev libgl-dev libpcre3-dev libtool-bin libssl-dev libxml-parser-perl lzip make openssl patch perl python3 python3-distutils python3-mako python3-pkg-resources python-is-python3 p7zip-full ruby sed unzip xz-utils

cd ~/Downloads
git clone https://github.com/mxe/mxe.git
cd mxe
git checkout bafab43e83

sed -i 's/c28c8be/9e219e2/' src/intel-tbb.mk
sed -i 's/a9a0f059703f9c018c83ec52bc10eb31d1e32da37f464a7de7fdcec80f23c645/194eadccc12f90586f17b329315fcb6f8834304e6a6e7724bcd0cb747c3e94ea/'  src/intel-tbb.mk
rm src/intel-tbb-1-fixes.patch

make MXE_TARGETS=x86_64-w64-mingw32.static boost qt6-qtbase intel-tbb
```

TBB's makefile is patched because as of MXE commit bafab43e83, the version that MXE builds by default is too old to be used for GCC's parallel algorithms support. The most recent TBB commit was used: you could probably use an earlier commit of TBB, but I don't expect anything earlier than [6c9faad](https://github.com/wjakob/tbb/commit/6c9faad2aa3d85a12826fbe5d6b964c590c12420) to work.

This builds static 64-bit binaries for Boost, Qt 6 and TBB, along with their dependencies and tools like GCC and MingGW-w64.

The build takes a long time (1 hour 45 minutes in my VM) and builds more than LOOT needs, but is the easiest way I found to get a consistent set of tools and cross-compiled dependencies (particularly Qt). MXE does have APT repositories containing prebuilt binaries so they might be another option.

Once built, add the new MinGW-w64 binaries to `PATH`:

```
export PATH="$PATH:$HOME/Downloads/mxe/usr/bin"
```

## Building libloot

libloot uses some [Rust](https://www.rust-lang.org/) libraries, so we also need to install the Rust toolchain and set it up for cross-compilation, and install cbindgen (which is used to generate C++ header files for the libraries).

```
wget -q -O - https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustup target add x86_64-pc-windows-gnu
cargo install cbindgen@0.24.5
```

libloot and LOOT use CMake for their builds, so create a CMake toolchain file at `$HOME/Downloads/toolchain.cmake` that configures CMake to use MingGW-w64:

```cmake
set(CMAKE_SYSTEM_NAME Windows)
set(CMAKE_SYSTEM_VERSION 10)

set(CMAKE_C_COMPILER   x86_64-w64-mingw32.static-gcc)
set(CMAKE_CXX_COMPILER x86_64-w64-mingw32.static-g++)

set(CMAKE_FIND_ROOT_PATH "$ENV{HOME}/Downloads/mxe/usr/x86_64-w64-mingw32.static")

set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)
```

Then clone the libloot Git repository and build libloot:

```
cd ~/Downloads
git clone https://github.com/loot/libloot.git
cd libloot
git checkout 3b41f57

mkdir -p build/docs/html
cd build

x86_64-w64-mingw32.static-cmake .. -DCMAKE_TOOLCHAIN_FILE=~/Downloads/toolchain.cmake
x86_64-w64-mingw32.static-cmake --build .
x86_64-w64-mingw32.static-cpack
```

CPack creates a 7-zip archive that is used when building LOOT. The archive filename is based on the libloot commit built, so if you're using a different version of libloot, make a note of the filename that's given in the console output.

libloot commits older than [58b96c9](https://github.com/loot/libloot/commit/58b96c982275944db845623bc893d56be5c66b4c) won't work without changes to its CMakeLists file.

## Building LOOT

Building LOOT will need its icon file created, so download svg_to_ico:

```
cd ~/Downloads
wget https://github.com/Ortham/svg_to_ico/releases/download/1.1.0/svg_to_ico.tar.xz
tar -xJf svg_to_ico.tar.xz
rm svg_to_ico.tar.xz README.md
```

The clone the LOOT Git repository and build LOOT:

```
cd ~/Downloads
git clone https://github.com/loot/loot.git
cd loot
git checkout 572fcb20

mkdir build
cd build

~/Downloads/svg_to_ico --output icon/icon.ico --input ../resources/icons/loot.svg

x86_64-w64-mingw32.static-cmake .. -DCMAKE_TOOLCHAIN_FILE=~/Downloads/toolchain.cmake -DLIBLOOT_URL=$HOME/Downloads/libloot/build/package/libloot-0.19.4-6-g3b41f57-win64.7z -DLIBLOOT_HASH=
x86_64-w64-mingw32.static-cmake --build .
```

`LIBLOOT_URL` points to the archive created earlier, so if you've built a different version of libloot, update the variable's value accordingly.

LOOT commits older than [dfda129](https://github.com/loot/loot/commit/dfda129a12699441d15a2766fb8f18e87efecfbc) won't work without changes to its CMakeLists file.

The build will fail when compiling OGDF. When this happens, fix it and continue the build like so:

```
sed -i 's/Psapi.h/psapi.h/' external/src/OGDF/src/ogdf/basic/System.cpp

x86_64-w64-mingw32.static-cmake --build .
```

This will create a `LOOT.exe` in the build directory. The build statically links everything except `libloot.dll` and the Windows DLLs that it and LOOT link against. It's also possible to buid libloot as a static library, but linking LOOT with it currently fails due to libloot's dependencies not getting linked.

## Install Wine and run LOOT

We need to install Wine to run LOOT, but the version of Wine that's in Ubuntu 20.04's repositories doesn't include everything required to start LOOT.

Instead, install Wine from Wine HQ's repository:

```
sudo mkdir -pm755 /etc/apt/keyrings
sudo wget -O /etc/apt/keyrings/winehq-archive.key https://dl.winehq.org/wine-builds/winehq.key
sudo wget -NP /etc/apt/sources.list.d/ https://dl.winehq.org/wine-builds/ubuntu/dists/focal/winehq-focal.sources
sudo apt-get update
sudo apt-get install -y --install-recommends winehq-stable
```

At time of writing, that installs Wine 8.0.2. LOOT can then be run like so:

```
wine64 ~/Downloads/loot/build/LOOT.exe
```
