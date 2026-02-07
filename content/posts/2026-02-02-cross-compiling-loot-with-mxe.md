---
title: Cross-compiling LOOT with dev containers
date: 2026-02-07
summary: With shared or static linking, and building LOOT's installer.
categories:
   - LOOT
---

[LOOT](https://loot.github.io/) is a utility that helps people use game mods for Bethesda's Elder Scrolls and Fallout games. It's available for Windows and Linux (Flatpak). Windows release builds are done using MSVC, and I typically use Visual Studio 2022 for local development on Windows and then make Linux-specific tweaks in whatever text editor my Linux VM has installed, but I've recently been experimenting with more Linux-based development.

Part of that is checking that the Windows builds still work, so I've been cross-compiling LOOT. I wrote a post about how to do that [back in 2023]({{< ref "2023-07-30-cross-compiling-loot" >}}), but things have changed since then, so this post updates and expands on that previous post.

I've included the contents of a few files in this post: they're also available in [LOOT's Git repository](https://github.com/loot/loot/tree/5b562855ad15cca0d0e77f00edd77b5848bf44eb).

## Build environment

I ran the builds in [dev containers](https://containers.dev/) running in Podman. The `devcontainer.json` was the same for each container, aside from the `name` field varying:

```json
{
  "name": "LOOT (Linux)",
  "build": {
    "dockerfile": "./Dockerfile"
  },
  "runArgs": [
    "--userns=keep-id",
  ],
}
```

I tested the dev containers on Windows 10 using VS Code, and on Fedora Kinoite 43 using CLion.

### Windows 10

I don't really know why you'd want to cross-compile LOOT in a Linux container when you're running a Windows host, but I tried it, and ran into a couple of issues that may also affect builds targeting Linux.

The first is that I had to configure two settings in VS Code:

```json
"dev.containers.dockerPath": "podman",
"dev.containers.mountWaylandSocket": false,
```

The first tells VS Code to use Podman instead of Docker, and the second fixes the container failing to start.

The second issue I found was that running the built test executables (using Wine) from within the mounted project workspace would cause them to immediately crash. The crashing tests also affect the LOOT build, because CMake's `gtest_discover_tests()` function runs the test executable at build time. The easiest solution is to create the build directory somewhere outside of the shared workspace.

### Fedora Kinoite 43

CLion needed to be told to use Podman by changing CLion's File > Settings > Build, Execution, Deployment > Docker > "Connect to Docker daemon with:" setting to be "Podman".

I found that SELinux caused permissions errors when mounting the project folder into the container, and for some reason configuring the container to append `relabel=shared` to the workspace mount (or specifying the mount as a volume with the `:z` suffix in `runArgs`) doesn't have any effect. I don't know if that's a limitation of CLion's beta support for Podman dev containers or if I'm doing something wrong, but I worked around it by manually running a different container first to set the SELinux labels, e.g.

```sh
podman run --rm -v ${PWD}:/workspace:z hello-world
```

## Building with MXE

I used [MXE](https://mxe.cc/) last time because it made cross-compiling all of LOOT's dependencies relatively simple, though it's slow because it compiles everything from scratch.

The `Dockerfile` for this dev container is:

```Dockerfile
FROM mcr.microsoft.com/devcontainers/rust:2-1-trixie

RUN rustup target add x86_64-pc-windows-gnu

RUN apt-get update && apt-get install -y --no-install-recommends \
    autopoint \
    bison \
    flex \
    g++-mingw-w64-x86-64 \
    gettext \
    gperf \
    intltool \
    libgl-dev \
    libtool-bin \
    lzip \
    p7zip-full \
    python3-mako \
    python3-setuptools \
    python-is-python3 \
    ruby \
    wine \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt

RUN git clone https://github.com/mxe/mxe.git \
    && cd mxe \
    && git checkout 6da7648ef4bf058e6c2719cd4094a498a340dbc7 \
    && make MXE_TARGETS=x86_64-w64-mingw32.static boost qt6-qtbase --jobs=2 JOBS=8

USER vscode
WORKDIR /home/vscode

RUN curl --proto '=https' --tlsv1.2 -sSfLO https://github.com/astral-sh/uv/releases/download/0.9.28/uv-x86_64-unknown-linux-gnu.tar.gz \
    && echo "66ad1822dd9cf96694b95c24f25bc05cff417a65351464da01682a91796d1f2b uv-x86_64-unknown-linux-gnu.tar.gz" | sha256sum -c \
    && mkdir -p /home/vscode/.local/bin \
    && tar -xzf uv-x86_64-unknown-linux-gnu.tar.gz -C /home/vscode/.local/bin --strip-components=1 \
    && rm uv-x86_64-unknown-linux-gnu.tar.gz

RUN curl --proto '=https' --tlsv1.2 -sSfLO https://github.com/Ortham/svg_to_ico/releases/download/1.3.1/svg_to_ico.tar.xz \
    && echo "04897b6384e7c3141c8343335b66bde3b184d7d65940980c38689b3ef4453f2f svg_to_ico.tar.xz" \
    && tar xJf svg_to_ico.tar.xz -C /home/vscode/.local/bin \
    && rm svg_to_ico.tar.xz

# Fix GetPreferredUILanguages.shouldReturnAtLeastOneLanguage() test
ENV LC_ALL=en_US.utf8 \
    WINEPATH="/usr/lib/gcc/x86_64-w64-mingw32/14-win32/" \
    PATH="$PATH:/opt/mxe/usr/bin"
```

I think you could skip `wine` if you pass `-DLOOT_BUILD_TESTS=OFF` when configuring the LOOT build, and `uv` isn't needed if you don't want to build LOOT's docs.

Compared to 2023's build environment:

- I'm using Debian 13 (a.k.a. Trixie), rather than Ubuntu 20.04.
- I no longer need Intel's TBB library (actually, I'm not sure why it was needed before, because it should only be needed for native Linux builds)
- I've upgraded my CPU to an AMD Ryzen 9800X3D, and with `--jobs=2 JOBS=8` the MXE build takes a little under 20 minutes, down from 105 minutes when using an Intel i5-8400 with the default parallelism (when you've got 6 or more cores) of `--jobs=1 JOBS=6`. It should probably be faster, but the CPU thermally throttles. I also tried the default parallelism, `--jobs=4 JOBS=4` and `--jobs=2 JOBS=6`, but they were slower.

MXE has APT repositories containing prebuilt packages, but they only support Debian 9 (Stretch) and 10 (Buster) and Ubuntu 14.04 (Trusty), 16.04 (Xenial), 18.04 (Bionic) and 20.04 (Focal), so they're far too old to be useful to me.

As an aside, I find Debian and Ubuntu's use of codenames instead of versions to refer to their distribution releases in many places (e.g. when looking up their package repositories) to be incredibly frustrating. They're opaque labels that are difficult to remember (Buster, Bullseye and Bookworm back-to-back, are you kidding me?!), difficult to compare (though Ubuntu's were in alphabetical order, until they looped back around), and you can't tell which is newest without looking that up. Ubuntu's date-based versioning is *right there* and solves all of those problems!

As before, I need to pass a toolchain file to CMake when building LOOT, to configure CMake for cross-compilation. The file is named `toolchain-mingw64.static.cmake`, and contains:

```cmake
set(CMAKE_SYSTEM_NAME Windows)
set(CMAKE_SYSTEM_PROCESSOR x86_64)
set(CMAKE_SYSTEM_VERSION 10)

set(CMAKE_C_COMPILER   x86_64-w64-mingw32.static-gcc)
set(CMAKE_CXX_COMPILER x86_64-w64-mingw32.static-g++)
set(CMAKE_RC_COMPILER  x86_64-w64-mingw32.static-windres)

set(CMAKE_FIND_ROOT_PATH "/opt/mxe/usr/x86_64-w64-mingw32.static")

set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)

set(CMAKE_CROSSCOMPILING_EMULATOR wine)
```

With that, I can build LOOT like so:

```sh
x86_64-w64-mingw32.static-cmake -B build . \
    -DCMAKE_BUILD_TYPE=RelWithDebInfo \
    -DCMAKE_TOOLCHAIN_FILE=$PWD/cmake/toolchain-mingw64.static.cmake

x86_64-w64-mingw32.static-cmake --build build --parallel $(nproc)
```

Compared to last time, I no longer need to patch OGDF or build libloot separately. I did have to fix a few new issues to get this working:

- There was one issue in libloot where MinGW wanted the Windows libraries used by the Rust standard library to be linked to the C++ wrapper's inner static library instead of its outer shared library. I don't really understand why the difference mattered. 🤷
- There were a few linker errors in LOOT due to more Qt modules being dependent on bzip2 than last time.
- There was one `Windows.h` include in LOOT that MinGW would only accept as `windows.h`.

However, when I ran LOOT's tests, a few of them failed because the version of libstdc++ that MXE builds does not handle `std::filesystem::copy_options::overwrite_existing` correctly, so masterlist updates encounter errors.

## Building with prebuilt Qt binaries

MXE isn't a requirement to cross-compile LOOT: I used it last time because it was a more convenient way of getting the necessary build tools and dependencies. This time around, Debian 13 is new enough (released August 2025) to provide MinGW-GCC 14, which is newer than the GCC 13 that LOOT's CI uses.

Cross-compiling Boost is fairly straightforward, and Qt provides prebuilt binaries built with MinGW. The main issue is that Qt needs you to build and link bzip2, which doesn't provide CMake build support, and its `make install` command fails when the `bzip2` executable is `bzip2.exe`. I got around that by manually running the relevant operations, as seen in this dev container `Dockerfile`:

```Dockerfile
FROM mcr.microsoft.com/devcontainers/rust:2-1-trixie

RUN rustup target add x86_64-pc-windows-gnu

RUN apt-get update && apt-get install -y --no-install-recommends \
    cmake \
    g++-mingw-w64-x86-64 \
    gettext \
    p7zip-full \
    wine \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt

RUN curl -sSLO https://archives.boost.io/release/1.90.0/source/boost_1_90_0.zip \
    && unzip boost_1_90_0.zip \
    && cd boost_1_90_0 \
    && echo "using gcc : mingw : x86_64-w64-mingw32-g++ ;" > user-config.jam \
    && ./bootstrap.sh \
    && ./b2 install --prefix=/usr/x86_64-w64-mingw32 --user-config=./user-config.jam toolset=gcc-mingw link=static runtime-link=shared variant=release address-model=64 target-os=windows cxxflags="-std=c++17 -fPIC" --with-locale \
    && cd .. \
    && rm -rf boost_1_90_0 boost_1_90_0.zip

RUN curl -sSfLO https://sourceware.org/pub/bzip2/bzip2-1.0.8.tar.gz \
    && echo "ab5a03176ee106d3f0fa90e381da478ddae405918153cca248e682cd0c4a2269 bzip2-1.0.8.tar.gz" | sha256sum -c \
    && tar -xf bzip2-1.0.8.tar.gz \
    && cd bzip2-1.0.8 \
    && make CC=x86_64-w64-mingw32-gcc libbz2.a \
    && export PREFIX=/usr/x86_64-w64-mingw32 \
    && cp -f bzlib.h $PREFIX/include \
    && cp -f libbz2.a $PREFIX/lib \
    && chmod a+r $PREFIX/include/bzlib.h $PREFIX/lib/libbz2.a \
    && cd .. \
    && rm -rf bzip2-1.0.8 bzip2-1.0.8.tar.gz

USER vscode
WORKDIR /home/vscode

RUN curl --proto '=https' --tlsv1.2 -sSfLO https://github.com/astral-sh/uv/releases/download/0.9.28/uv-x86_64-unknown-linux-gnu.tar.gz \
    && echo "66ad1822dd9cf96694b95c24f25bc05cff417a65351464da01682a91796d1f2b uv-x86_64-unknown-linux-gnu.tar.gz" | sha256sum -c \
    && mkdir -p /home/vscode/.local/bin \
    && tar -xzf uv-x86_64-unknown-linux-gnu.tar.gz -C /home/vscode/.local/bin --strip-components=1 \
    && rm uv-x86_64-unknown-linux-gnu.tar.gz

RUN curl --proto '=https' --tlsv1.2 -sSfLO https://github.com/Ortham/svg_to_ico/releases/download/1.3.1/svg_to_ico.tar.xz \
    && echo "04897b6384e7c3141c8343335b66bde3b184d7d65940980c38689b3ef4453f2f svg_to_ico.tar.xz" \
    && tar xJf svg_to_ico.tar.xz -C /home/vscode/.local/bin \
    && rm svg_to_ico.tar.xz

RUN /home/vscode/.local/bin/uv run --with aqtinstall==3.3.0 -- aqt install-qt windows desktop 6.9.1 win64_mingw \
    && /home/vscode/.local/bin/uv run --with aqtinstall==3.3.0 -- aqt install-qt linux desktop 6.9.1 linux_gcc_64 --archives icu qtbase \
    && sudo mkdir /opt/qt \
    && sudo mv /home/vscode/6.9.1 /opt/qt/ \
    && rm aqtinstall.log

# Fix GetPreferredUILanguages.shouldReturnAtLeastOneLanguage() test
ENV LC_ALL=en_US.utf8 \
    WINEPATH="/usr/lib/gcc/x86_64-w64-mingw32/14-win32/;/opt/qt/6.9.1/mingw_64/bin/"
```

The `toolchain-mingw64.cmake` toolchain file is very similar to the one above:

```cmake
set(CMAKE_SYSTEM_NAME Windows)
set(CMAKE_SYSTEM_PROCESSOR x86_64)
set(CMAKE_SYSTEM_VERSION 10)

set(CMAKE_C_COMPILER   x86_64-w64-mingw32-gcc)
set(CMAKE_CXX_COMPILER x86_64-w64-mingw32-g++)
set(CMAKE_RC_COMPILER  x86_64-w64-mingw32-windres)

set(CMAKE_FIND_ROOT_PATH /usr/x86_64-w64-mingw32)

set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)

set(CMAKE_CROSSCOMPILING_EMULATOR wine)
```

The build commands are also very similar:

```sh
cmake -B build . -DCMAKE_BUILD_TYPE=RelWithDebInfo \
    -DCMAKE_TOOLCHAIN_FILE=$PWD/cmake/toolchain-mingw64.cmake \
    -DCMAKE_PREFIX_PATH=/opt/qt/6.9.1/mingw_64 \
    -DQT_HOST_PATH=/opt/qt/6.9.1/gcc_64

cmake --build build --parallel $(nproc)
```

As mentioned, the shared MinGW binaries expect you to link to bzip2, and also to Brotli's `brotlicommon` library, so I updated LOOT's CMake config to explicitly depend on both, and a cross-compiled build will now download and build Brotli if it can't find it.

Although Debian 13 provides UCRT-based mingw-w64 packages, this build still uses the MSVCRT-based packages because that's what Rust's `x86_64-pc-windows-gnu` target links to. Unfortunately the `*-windows-gnu` targets currently have no maintainers, so this probably won't change any time soon.

`QT_HOST_PATH` is used to point to a Linux build of Qt, so that the CMake build can run its `moc`, `rcc` and `uic` tools. It needs to be the same version of Qt as the build is targeting, which is why the dev container installs the `linux_gcc_64` Qt binaries instead of just using what's provided in Debian's package repositories.

The other thing that's worth mentioning is that Qt's prebuilt binaries link to and ship with older versions of `libstdc++-6.dll` and `libgcc_s_seh-1.dll` that don't provide some of the functionality used by the rest of the built binaries, so if you try to start LOOT using them, it will crash. The `windeployqt` utility copies across the older DLLs, but I've added a `replace_mingw_dlls.sh` script to replace them with the first of each DLL that's in `WINEPATH`: in the dev container, that bundles the newer version of the DLLs. The script is:

```sh
#!/usr/bin/env bash
set -e

TARGET_DIR="$1"
DLL_NAMES=(
  "libstdc++-6.dll"
  "libgcc_s_seh-1.dll"
)

if [ -z "$TARGET_DIR" ]
then
  echo "Please supply a target directory!"
  exit 1
fi

if [ -n "$WINEPATH" ]
then
  IFS=";" read -ra WINE_PATHS <<< "$WINEPATH"

  for DLL_NAME in "${DLL_NAMES[@]}"
  do
    for WINE_PATH in "${WINE_PATHS[@]}"
    do
      if [ -e "$WINE_PATH/$DLL_NAME" ]
      then
        if [ -e "$TARGET_DIR/$DLL_NAME" ]
        then
          echo "Replacing the $DLL_NAME in $TARGET_DIR with the one in $WINE_PATH"
        fi

        cp -f "$WINE_PATH/$DLL_NAME" "$TARGET_DIR/$DLL_NAME"
        break
      fi
    done
  done
fi
```

Although this build doesn't from the same `overwrite_existing` limitation as the MXE build, I've noticed that neither build supports long paths: I found a couple of [relevant](https://github.com/mingw-w64/mingw-w64/issues/106) [issues](https://github.com/mingw-w64/mingw-w64/issues/139) about that on GitHub, and someone posted a patch on [SourceForge](https://sourceforge.net/p/mingw-w64/bugs/984/), but it doesn't look like that went anywhere.

### Building LOOT's installer

This is where things get a bit awkward. LOOT's installer is built using Inno Setup, which is only available for Windows. Inno Setup itself can only be installed by running its installer, and while that installer does provide options to run silently, it will still fail if there is no display available.

Dev containers are headless environments by default, so first that needs to be changed, by adding the following to `devcontainer.json`:


```json
{
  "features": {
    "ghcr.io/devcontainers/features/desktop-lite:1": {}
  },
  "forwardPorts": [5901, 6080]
}
```

That gives the container a VNC server and a Fluxbox desktop, which can be accessed on port 5901 by a VNC client, or on port 6080 by a web browser (the page loads an in-browser VNC client).

With that in place, we can add Inno Setup to the `Dockerfile`, but again it's not that easy:

1. So far we've been using Wine to run 64-bit applications, but Inno Setup is 32-bit. Historically that has meant needing to use separate Wine prefixes, but as of Wine 11 its WoW64 support is complete, so that can be used instead. Without it, trying to run 32-bit executables in a 64-bit Wine prefix would cause "missing *32.dll" errors. Debian 13 only provides Wine 10, so that means Wine 11 needs to be installed from WineHQ's repository.
2. The VNC server display is not available while the dev container's image is being built, so we can download the Inno Setup installer, but we can't actually run it until the container starts.
3. When Wine starts and a display is available, it displays a dialog box asking if the user wants it to download and install wine-mono, if it isn't already installed. There don't seem to be any configuration options or CLI parameters to either automatically accept the offer (like passing `-y` to `apt-get install`) or to suppress the dialog box.

   This means that if you run the Inno Setup installer from the CLI, it will hang until you connect to the VNC server and accept or dismiss the wine-mono dialog. Not ideal.

   My workaround is to download and install wine-mono before running the Inno Setup installer. For reasons I don't understand, if I run the wine-mono installer during the Docker build it exits successfully, but wine-mono doesn't then appear to have been installed, so like Inno Setup its installation needs to be deferred until container startup.

   Also, the wine-mono dialog appears when you're trying to run wine-mono's installer. 🙄 The `WINEDLLOVERRIDES` env var can be set to break the wine-mono check, so that's done when the installer is invoked: I don't want to set it for other Wine invocations because I don't know what else would break.

So, here's the additions to the `Dockerfile`:

```Dockerfile
# This is needed to run the Inno Setup installer without having to juggle
# 32-bit and 64-bit wine prefixes.
# <https://gitlab.winehq.org/wine/wine/-/wikis/Debian-Ubuntu>
RUN mkdir -pm755 /etc/apt/keyrings \
    && wget -O - https://dl.winehq.org/wine-builds/winehq.key | gpg --dearmor -o /etc/apt/keyrings/winehq-archive.key - \
    && dpkg --add-architecture i386 \
    && wget -NP /etc/apt/sources.list.d/ https://dl.winehq.org/wine-builds/debian/dists/trixie/winehq-trixie.sources

RUN apt-get update && apt-get install -y --no-install-recommends winehq-stable \
    && rm -rf /var/lib/apt/lists/*

USER vscode
WORKDIR /home/vscode

RUN curl --proto '=https' --tlsv1.2 -sSfLO https://github.com/PowerShell/PowerShell/releases/download/v7.5.4/powershell-7.5.4-linux-x64.tar.gz \
    && echo "1fd7983fe56ca9e6233f126925edb24bf6b6b33e356b69996d925c4db94e2fef powershell-7.5.4-linux-x64.tar.gz" | sha256sum -c \
    && sudo mkdir /opt/powershell-7.5.4-linux-x64 \
    && sudo tar -xf powershell-7.5.4-linux-x64.tar.gz -C /opt/powershell-7.5.4-linux-x64 \
    && sudo chmod +x /opt/powershell-7.5.4-linux-x64/pwsh \
    && rm powershell-7.5.4-linux-x64.tar.gz

# The installer exits successfully but doesn't work correctly if it's run during the image build.
RUN curl --proto '=https' --tlsv1.2 -sSfLO https://dl.winehq.org/wine/wine-mono/7.4.0/wine-mono-7.4.0-x86.msi \
    && echo "6413ff328ebbf7ec7689c648feb3546d8102ded865079d1fbf0331b14b3ab0ec wine-mono-7.4.0-x86.msi" | sha256sum -c

# Can't run the installer before a display is available.
RUN curl --proto '=https' --tlsv1.2 -sSfLO https://github.com/jrsoftware/issrc/releases/download/is-6_7_0/innosetup-6.7.0.exe \
    && echo "f45c7d68d1e660cf13877ec36738a5179ce72a33414f9959d35e99b68c52a697 innosetup-6.7.0.exe" | sha256sum -c

COPY install_inno_setup.sh /home/vscode/

ENV PATH="$PATH:/opt/powershell-7.5.4-linux-x64"
```

PowerShell is installed because LOOT has a PowerShell script that needs to be run before building the installer. The script downloads or generates a few files for the installer to package (e.g. the latest masterlists, so you have masterlists if you install LOOT on a computer without internet access).

The `install_inno_setup.sh` script looks like this:

```sh
#!/usr/bin/env sh
set -e

# Install wine-mono while suppressing the dialog about wine-mono not being
# installed, to prevent the dialog being displayed while running the Inno
# setup installer or compiler.
WINEDLLOVERRIDES="mscoree=;mshtml=;" wine msiexec \
    -i /home/vscode/wine-mono-7.4.0-x86.msi /quiet /qn

# Install Inno Setup to "C:/Program Files (x86)/Inno Setup 6" in the Wine 
# prefix. This fails if there is no display, even though it doesn't display
# anything.
wine /home/vscode/innosetup-6.7.0.exe /VERYSILENT /ALLUSERS /SUPPRESSMSGBOXES
```

and to run it on startup, the following is added to `devcontainer.json`:

```json
{
  "postCreateCommand": "/home/vscode/install_inno_setup.sh"
}
```

Finally, because the installer is packaging a cross-compiled build of LOOT, it had to be updated to include the MinGW runtime DLLs:

```
#if FileExists(AddBackslash(SourcePath) + '..\' + AddBackslash(ArtifactsDir) + 'libstdc++-6.dll')

Source: "{#ArtifactsDir}\libgcc_s_seh-1.dll"; \
DestDir: "{app}"; Flags: ignoreversion

Source: "{#ArtifactsDir}\libstdc++-6.dll"; \
DestDir: "{app}"; Flags: ignoreversion

Source: "{#ArtifactsDir}\libwinpthread-1.dll"; \
DestDir: "{app}"; Flags: ignoreversion

#endif
```

With all that, once LOOT is built, creating the installer is a matter of running:

```sh
uv run --project docs -- sphinx-build -b html docs build/docs/html

pwsh ./scripts/prepare_installer.ps1

wine "C:/Program Files (x86)/Inno Setup 6/ISCC.exe" scripts/installer.iss
```

## Running LOOT

Although LOOT is available as a Flatpak application, there *are* a couple of reasons to run the Windows build on Linux through Wine:

1. LOOT expects to see the same filesystem case-sensitivity as the games it supports do, but Linux filesystems are generally case-sensitive, and when the games are run through Wine, Wine provides a case-insensitive view of the filesystem. This can cause problems: for example, if a plugin `A.esp` says it depends on plugin `B.esp`, which is installed as `b.esp`, the game doesn't see the difference but LOOT does and may think that the dependency isn't met. Running LOOT in Wine gets around this issue.
2. Some other modding utilities (e.g. [Mod Organizer 2](https://github.com/ModOrganizer2/modorganizer)) use a virtual filesystem to manage mods, and require other applications to be launched through them to see the "installed" mods, but are only available as Windows applications. That means that if you're using MO2 to manage your mods, you need to install LOOT as a Windows application so that you can launch it through MO2.

However, those aren't reasons to run a *MinGW* build. On Windows it seems pretty clear that MSVC builds are preferable, and I'm not sure if there are any reasons for users on Linux to prefer a MinGW build over an MSVC build.

In any case, since the dev container has a VNC server, it's possible run run LOOT inside the dev container, though that's only really useful for checking that it starts up OK, because there aren't any games for it to work with. Beyond that, I've been trying out using a Distrobox container or Bottles to provide Wine and running LOOT in that, configuring it with the install paths of the games I've installed using Steam and Heroic Games Launcher.

Both approaches are a bit clunky, and I'm not sure how useful such testing is: the behavioural differences between MinGW and MSVC and between Wine and Windows mean that testing MinGW builds on Wine isn't an effective substitute for testing MSVC builds on Windows. Instead I'd have to either reboot into Windows or start a Windows VM to perform a build using MSVC there (or download a build from CI), and then run that build against games installed in that environment.

Still, the ability to produce and run MinGW builds provides a relatively low-friction way to perform some basic checks that the Windows build works, while developing on Linux.
