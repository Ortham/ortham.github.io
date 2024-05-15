---
title: LOOT on Linux
date: 2023-11-15
summary: Going from tests passing on CI to distribution on Flathub.
categories:
   - LOOT
   - Linux
aliases:
  - /2023/11/15/loot-on-linux.html
---

[LOOT](https://loot.github.io/) is a utility that helps people use game mods for Starfield and Bethesda's Elder Scrolls and Fallout games. These games are native Windows applications, and LOOT has been released as a native Windows application for the last almost-decade. However, LOOT's CI includes Linux builds, and over the years there has been some interest in running it as a native Linux application as well as running the Windows build in Linux using [Wine](https://www.winehq.org/).

I was against officially supporting Linux as recently as [early June 2023](https://discord.com/channels/473542112974077963/496196499890241546/1120813443969196072), but by mid-August I'd [changed my tune](https://github.com/loot/loot/issues/1893) and had begun to investigate what would be needed to properly support Linux, and Linux support was released in mid-September with LOOT v0.21.0.

## Why I didn't want to add Linux support

To summarise what I wrote in the series of Discord messages linked to above:

- LOOT supports games which are Windows applications. If you can run those games on Linux using Wine, you should be able to run LOOT using Wine, so no extra effort should be needed to support Linux users.
- LOOT as a native Linux application would have a worse user experience, because Linux isn't a first-class target for the games LOOT supports. This is mainly due to things like filesystem case-insensitivity being expected by the game and LOOT, and the difficulty in finding installed games without the Windows Registry and in determining the Windows/Wine user that the game runs under.
- Linux is not a single target. With Windows there's relatively little variation in the infrastructure supporting desktop graphical applications, and LOOT only supports 64-bit Windows 10 and 11. That means a lot of decisions are already made, and for others whatever approach you take will probably work for almost all users. With Linux, there's so much more choice, and that means so much more learning needs to be done to understand the impact of the choices you make. Past that, when it's the user's choice, supporting different combinations of different user choices is impractical and highly unappealing.
- Relatively speaking, hardly anyone uses desktop Linux, so it's not something that seems worthwhile supporting unless I'm personally motivated to do so.

## Why did I change my mind?

What kicked off the change was a [bug report](https://github.com/loot/loot/issues/1886) about LOOT v0.20.0 crashing on startup when run using Wine, which invalidated my first reason not to support Linux above. It looks like the issue is due to a Qt update included in that release of LOOT that introduced a dependency on a Windows API that wasn't implemented by Wine.

With a fix practically out of my hands (I wasn't about to start debugging and learning how to contribute to Wine), I started considering other options. I cross-compiled LOOT for Windows from Linux and the resulting executable ran fine using Wine, so that was one option, but:

- the cross-compilation process was very slow and I didn't think it would be practical in CI.
- I didn't know why the build worked: maybe it just omitted a chunk of significant but not immediately obvious functionality. This is a potential issue that extends across the whole codebase, and having two very similar but not identical builds that can be run on the same platform seems like a support headache.
- experience has shown that people find multiple download options confusing and they can pick the wrong one even when the options are clearly described. Having a separate Windows build meant for Linux users would probably end up with more Windows users mistakenly running it than Linux users intentionally running it.

Downgrading Qt wasn't attractive as updates do bring fixes and improvements that can be significant, and Qt only supports each minor release for 6 months unless you pay them (which is fair enough, but LOOT is free and a Qt commercial license costs at least $3790 per year).

So that left providing a Linux build as the obvious alternative.

## Picking an initial target

As mentioned above, desktop Linux is more of a category than a single target, and it's much easier to start with a narrow scope and widen it over time than it is to start with a wide scope.

I'd noticed a few people mention that they were trying to use LOOT on a [Steam Deck](https://www.steamdeck.com/en/). The Steam Deck is relatively popular amongst Linux gamers, enjoying 43% of Linux Steam users, according to the Steam Hardware & Software Survey (at time of writing). It's also a single hardware and software stack: in other words, a great target!

I decided to first focus on targeting users playing Steam games on the Steam Deck: if that went well, then I could extend support further.

## Extending game detection

While LOOT is written as a cross-platform application, not all functionality was implemented on Linux. Most significantly, LOOT was not able to find installed games on Linux unless it was manually configured with their paths. There are two paths LOOT needs for each game:

1. The game's install path, where the game's files (including plugins) are installed to.
2. The game's local app data path, where the game's active plugins list (and load order, for some games) is stored.

Most of LOOT's ability to detect install paths comes from looking them up in Windows Registry entries. This obviously doesn't work on Linux.

The local app data paths are all in subdirectories of the Windows user's local app data directory:
identifying the appropriate subdirectory is not an issue, but finding the Windows user's local app data directory is a problem when you're on Linux.

### Finding Steam game install paths

I added the ability to read Steam's config files to find where it has installed games. On Linux, Steam's config files can be found in `~/Steam`. LOOT will also check the config files in `~/.var/app/com.valvesoftware.Steam/.local/share/Steam`, which is used by the [unofficial Flatpak application](https://flathub.org/apps/com.valvesoftware.Steam): although it's unofficial, it has over 2 million installs, so I thought it was worth supporting.

The starting point is Steam's `config/libraryfolders.vdf` file, which uses Valve's KeyValues file format. `libraryfolders.vdf` lists all the locations that Steam is configured to install games to, along with a list of installed game IDs for each location.

As an example, here's the `libraryfolders.vdf` file from my Steam install on Windows:

```
"libraryfolders"
{
	"0"
	{
		"path"		"C:\\Program Files (x86)\\Steam"
		"label"		""
		"contentid"		"11370982602267915234"
		"totalsize"		"0"
		"update_clean_bytes_tally"		"3489050567"
		"time_last_update_corruption"		"0"
		"apps"
		{
			"228980"		"201098817"
		}
	}
	"1"
	{
		"path"		"D:\\Games\\Steam"
		"label"		""
		"contentid"		"72869211463649451364"
		"totalsize"		"392177905664"
		"update_clean_bytes_tally"		"134963177434"
		"time_last_update_corruption"		"1637608828"
		"apps"
		{
			"221640"		"22708311"
			"489830"		"15345519558"
			"508440"		"4782052039"
			"736260"		"111328718"
			"763890"		"2235117185"
			"1716740"		"124858920798"
			"2283300"		"589830227"
		}
	}
}
```

The `path` values are the only things that LOOT is interested from that file. I initially thought that the game IDs under `apps` would also be useful, but it turns out that installing a game doesn't necessarily immediately update `libraryfolders.vdf`. As such, LOOT ignores the listed game IDs and instead just checks all listed paths for all supported games. It's less efficient, but provides a better user experience.

Each Steam library folder stores installed games in subdirectories of `<library folder>/steamapps/common/`. While the subdirectory names seemed to be consistent, I didn't want to hardcode them in case I was wrong about that: instead, LOOT reads each game's subdirectory name from a game-specific config file found at `<library folder>/steamapps/appmanifest_<ID>.acf`. This file also uses the KeyValues file format.

Here's the `appmanifest_489830.acf` from my Skyrim: Special Edition install on Windows:

```
"AppState"
{
	"appid"		"489830"
	"Universe"		"1"
	"LauncherPath"		"C:\\Program Files (x86)\\Steam\\steam.exe"
	"name"		"The Elder Scrolls V: Skyrim Special Edition"
	"StateFlags"		"4"
	"installdir"		"Skyrim Special Edition"
	"LastUpdated"		"1664304337"
	"SizeOnDisk"		"15345519558"
	"StagingSize"		"0"
	"buildid"		"9518483"
	"LastOwner"		"76561198033346845"
	"AutoUpdateBehavior"		"0"
	"AllowOtherDownloadsWhileRunning"		"0"
	"ScheduledAutoUpdate"		"0"
	"StagingFolder"		"0"
	"InstalledDepots"
	{
		"489831"
		{
			"manifest"		"3660787314279169352"
			"size"		"6760136813"
		}
		"489832"
		{
			"manifest"		"2756691988703496654"
			"size"		"8550012993"
		}
		"489833"
		{
			"manifest"		"5291801952219815735"
			"size"		"35369752"
		}
	}
	"InstallScripts"
	{
		"489831"		"installscript.vdf"
	}
	"SharedDepots"
	{
		"228986"		"228980"
		"228990"		"228980"
	}
	"UserConfig"
	{
		"language"		"english"
		"BetaKey"		""
	}
	"MountedConfig"
	{
		"language"		"english"
		"BetaKey"		""
	}
}
```

LOOT validates that the `appid` value matches the expected game ID (which is also the one in the filename) and then uses the `installdir` value to construct the game's full install path.

The KeyValues file format is [poorly documented](https://developer.valvesoftware.com/wiki/KeyValues) by Valve, but people have published a few third-party libraries that can parse it, so I picked one that seemed of relatively high quality ([ValveFileVDF](https://github.com/TinyTinni/ValveFileVDF)).

This new Steam game install detection is also done on Windows, and there it means that a user who installs a game through Steam no longer needs to run the game's launcher (to add the game's Registry entry) before LOOT can find the game.

### Finding Steam game local data paths

When you run a Windows application under Wine, Wine stores its own data and any application-specific data in a directory known as a Wine prefix. That data includes Windows Registry entries and files created by the application.

Steam uses a separate Wine prefix for each game and stores each at `<library folder>/steamapps/compatdata/<game ID>`, in the same Steam library folder as the game install path. Steam also uses the `steamuser` Windows user in all of its Wine prefixes, so each game's local data path is predictable once you've found its install path.

### Heroic Games Launcher

Steam is only one of a few sources for LOOT's supported games, though it's the only one that provides an official Linux client. Once I was convinced that a Linux release would be viable, I added support for GOG and Epic Games Store games installed using [Heroic Games Launcher](https://heroicgameslauncher.com/).

Unlike Steam, Heroic doesn't have the concept of library paths, so games can be installed anywhere, and their Wine prefixes are not necessarily co-located. Fortunately Heroic Games Launcher stores game install paths and Wine prefix paths in easily-discoverable JSON files, and like Steam it uses the `steamuser` Windows user in its Wine prefixes.

Like the new Steam game detection, Heroic Games Launcher is supported as an un-sandboxed and [Flatpak](https://flathub.org/apps/com.heroicgameslauncher.hgl) application on Linux, and on Windows.

## Packaging & distributing LOOT

On Windows, distributing LOOT is as simple as telling people they need the MSVC redistributable  (which they probably already have) installed, and bundling LOOT and its other runtime dependencies into an archive for people to download.

On Linux, if dependencies are bundled with an application then:

- dependencies may not be portable across different Linux distributions.
- for more complex dependencies like Qt it can be difficult to identify all the files that need to be bundled, and the dependencies may themselves have runtime dependencies, and so on.
- bundled libraries only get used if you first set an environment variable, but doing that globally is a bad idea, so there would need to be a separate launcher script to do that and then run LOOT. Static linking would avoid that problem, but would need dependencies to be built statically, which isn't feasible in CI.

If dependencies aren't bundled then you're reliant on users being able to easily install the same versions of dependencies as were used to build LOOT. Even if the right versions of the dependencies are available in their Linux distribution's repositories, that still means running some CLI commands, which isn't a good user experience for an otherwise graphical application.

[Flatpak](https://flatpak.org/) is a framework for distributing desktop applications across various Linux distributions. It allows you to build an application that is relatively isolated from the host system, and which can depend on a runtime that supplies many commonly-used dependencies. This means that many dependencies don't need to be bundled into the application, and those that do get bundled can be used without risking any impact on the rest of your system. The framework also provides desktop integration so that running a Flatpak application is just like running any other application.

[Snap](https://snapcraft.io/) and [AppImage](https://appimage.org/) are two other ways of solving the same problems: Snap seems fairly similar to Flatpak, while AppImage is less of a framework and more of a way to create single-file executables that contain all their dependencies. I decided to try out Flatpak first as LOOT already had [an issue](https://github.com/loot/loot/issues/1757) requesting a Flatpak application, and Flatpak seems to be the preferred way to install applications on the Steam Deck. If Flatpak hadn't worked out I would have tried Snap and AppImage, but I didn't end up needing to.

### Packaging with Flatpak

A Flatpak application is built using a manifest file that describes the application and how to build it. Here's the manifest that LOOT uses in its CI builds:

```yaml
app-id: io.github.loot.loot
runtime: org.kde.Platform
runtime-version: '6.5'
sdk: org.kde.Sdk
command: LOOT
finish-args:
  # Omitted for brevity
modules:
  - name: application
    buildsystem: simple
    build-commands:
      - install -D bin/LOOT /app/bin/LOOT
      - install -D lib/libloot.so /app/lib/libloot.so
      - cp -r share /app
    sources:
      - type: archive
        path: ../../build/loot.tar.xz
  - name: libtbb
    buildsystem: simple
    build-commands:
      - install -D lib/intel64/gcc4.8/libtbb.so.2 /app/lib/
      - install -D LICENSE /app/share/doc/libtbb2/copyright
    sources:
      - type: archive
        url: https://github.com/oneapi-src/oneTBB/releases/download/v2020.3/tbb-2020.3-lin.tgz
        sha256: bb8cddd0277605d3ee7f4e19b138c983f298d69fcbb585385b59ef7239d5ef83
```

Here you can see that the LOOT Flatpak application uses the KDE platform runtime, which provides LOOT's Qt and ICU runtime dependencies, and that LOOT and the Intel TBB runtime dependency are installed from archives supplying prebuilt binaries. `../../build/loot.tar.xz` is an archive that is produced as part of LOOT's CI job.

The Linux archive produced by LOOT's CI used to include the Qt, ICU and TBB dependencies, and it was ~ 70 MB (mostly due to Qt). Since those third-party dependencies are supplied as part of building the Flatpak application, the archive is now ~ 10 MB, and the Flatpak application is only ~ 8 MB (due to better compression). Of course, that doesn't include the size of the KDE platform runtime, which is much larger, but that is shared across all Flatpak applications that use it.

As well as the manifest file, Flatpak uses [AppStream](https://www.freedesktop.org/wiki/Distributions/AppStream/) and [Desktop Entry](https://specifications.freedesktop.org/desktop-entry-spec/desktop-entry-spec-latest.html) files for integration with software centers and desktops respectively, so supporting Flatpak builds also involved adding those files. Those files are included in the Linux archive because they're not Flatpak-specific.

#### Building from source vs. prebuilt binaries

As mentioned above, LOOT's Flatpak application is built using prebuilt binaries. The Flatpak documentation encourages and seems to be partially written assuming that packages are built from source. This has its advantages, primarily that it ensures that the binaries are linked against the versions of shared libraries that are part of the runtime, rather than a different (and potentially incompatible) version.

However:

- building LOOT from source takes about 20 minutes and involves several steps (mostly thanks to preparing build dependencies). This is already done as part of CI, and I'd rather not repeat the work or maintain a second translation of the build process for creating the Flatpak application.
- it's not clear what the Flatpak build environment looks like, beyond what's included in the chosen SDK, and the Flatpak documentation lists the available SDKs but doesn't (at time of writing) provide any links to anywhere you could find out what's in an SDK (or a runtime, for that matter).
- if I built the LOOT Flatpak application from source, I probably wouldn't provide a Linux archive, as otherwise it and the Flatpak application might differ in subtle and confusing ways and I wouldn't want to deal with that. That's probably not a big deal though.

To ensure binary compatibility, I updated the version of ICU that libloot and LOOT link against to match the version provided by the KDE platform runtime, and I'll keep those versions in sync over time.

I'd like to revisit the issue in the future as I'm not a fan of that process--it's too reliant on me remembering to perform manual actions correctly--but for now the current approach seems like an effective compromise.

#### Permissions

The `finish-args` value that was omitted in the manifest file above is:

```yaml
finish-args:
  - --device=dri
  - --share=ipc
  - --share=network
  - --socket=fallback-x11
  - --socket=wayland
  - --socket=pulseaudio
  # Steam package data.
  - --filesystem=xdg-data/Steam:ro
  # Steam package default library paths.
  - --filesystem=xdg-data/Steam/steamapps/common
  - --filesystem=xdg-data/Steam/steamapps/compatdata
  # Steam Flatpak data.
  - --filesystem=~/.var/app/com.valvesoftware.Steam/.local/share/Steam:ro
  # Steam Flatpak default library paths.
  - --filesystem=~/.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps/common
  - --filesystem=~/.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps/compatdata
  # Steam Deck SD card mount point parent path.
  - --filesystem=/run/media
  # Heroic Games Launcher package config.
  - --filesystem=xdg-config/heroic:ro
  # Heroic Games Launcher Flatpak config.
  - --filesystem=~/.var/app/com.heroicgameslauncher.hgl/config/heroic:ro
  # Heroic Games Launcher default games install path.
  - --filesystem=~/Games/Heroic
```

These arguments set the default permissions given to the LOOT Flatpak application, and users are shown them when they install it. The first set of permissions are generic Qt application permissions, and the filesystem permissions only grant access to the default Steam and Heroic Games Launcher game install paths.

The Steam Deck's SD card is particularly significant for modded games because the SD card is formatted as ext4 with case folding enabled, so games installed there won't suffer from any potential issues relating to Linux's usual filesystem case-sensitivity.

Limiting filesystem access like this does mean that users who install games outside of those default paths will have to explicitly grant LOOT access to the non-default install paths they use, but the alternative is to grant access to the whole filesystem, which defeats the purpose of having the filesystem sandboxed. Unfortunately granting access isn't as smooth a process as it could be: you have to do it on the command line using `flatpak override` or by using a third-party application like [Flatseal](https://flathub.org/apps/com.github.tchx84.Flatseal). Ideally there would be some way to grant access from within the application without having to go through a file picker dialog (which isn't appropriate during game detection as the point is to avoid the user having to select paths), but as far as I'm aware that capability doesn't exist.

I found the documentation on the filesystem sandboxing permissions confusing at first, as I thought you had to grant access to a much wider range of paths that your application uses (e.g. I had `--filesystem=/proc/self/exe` as LOOT uses that path).

#### Flatpak-specific issues

There were some issues that I encountered only when running LOOT as a Flatpak application:

- Qt's `QDesktopServices::openUrl()` function tried to open file paths using the path of a file inside the sandbox, so e.g. when trying to open the LOOT documentation my web browser would open and complain that it couldn't find the file. LOOT works around this by running `xdg-open` instead.
- When the application window is not the active window its text greys out, which doesn't happen when LOOT is run outside of Flatpak - this revealed [a bug](https://github.com/loot/loot/issues/1895) as plugin card text wouldn't grey out with the rest of the text. This was fixed by adding a slot that listened for the signal emitted when the application state changed, and forcing a styling refresh when the state change was a window going from active to inactive or vice versa.
- Native theming (i.e. when using LOOT's default theme) works differently, and there's [an issue](https://github.com/loot/loot/issues/1896) somewhere between Qt, Flatpak and the host OS that means system theme changes don't cause Qt to fire the appropriate signal when it should. This is still an issue as of LOOT v0.22.1.
- The application binary's parent directory is not easily writeable, so any files that the user needs to add to the application (e.g. themes) should be read from the appropriate config or data directory instead.

### Distributing snapshot builds

The preferred way to distribute Flatpak applications is using an online repository, and it's possible to download Flatpak applications from an online repository for offline installation using `flatpak create-usb` (which, despite the name, has nothing to do with USB drives).

LOOT's CI job produces snapshot builds to simplify manual testing, and they are hosted as GitHub Actions artifacts. `flatpak create-usb` isn't suitable for this scenario because the Flatpak application built in CI is not published to any online repository, so instead it is made available as a [single-file bundle](https://docs.flatpak.org/en/latest/single-file-bundles.html).

The key difference between single-file bundles and the output of `flatpak create-usb` is that the latter includes dependencies (e.g. the runtime that the application uses) while the former does not. However, when you install the single-file bundle Flatpak can automatically download and install the runtime it uses (assuming that the bundle was created using the `--runtime-repo` argument), so that's not a problem.

### Distributing with Flathub

[Flathub](https://flathub.org/) is the main repository for Flatpak applications (though Flatpak is decentralised and can be configured to use other repositories). Linux distribution software centers also integrate with Flathub so that applications available there can be installed through software center GUIs alongside applications from distribution repositories.

I found the process for publishing to Flathub to be [well documented](https://docs.flathub.org/docs/category/for-app-authors), and while I don't agree with all their quality guidelines, I do appreciate the consistency they provide: it's a bit like code formatting in that way. I found it quite difficult to keep the summary and description short enough, and it's a little annoying to repeat the version history in the release notes, but I try to write them as a Linux-specific summary and link to the version history on [Read The Docs](https://loot.readthedocs.io/en/stable/app/changelog.html) for details.

Unfortunately, my choice to use prebuilt binaries did lead to a [negative first interaction](https://github.com/flathub/flathub/pull/4523) with Flathub's maintainers, as the first person to review my pull request to create a Flatpak repository seemed to place ideological purity above practicality with no attempt to justify or explain why. Fortunately, another maintainer merged the pull request. Once the [repository](https://github.com/flathub/io.github.loot.loot) was created I was able to then update [LOOT on Flathub](https://flathub.org/apps/io.github.loot.loot) at will, and I received some good constructive criticism from other Flathub maintainers.

New releases are queued for 3 hours, but it's possible to manually trigger the release early once it's in the queue. I tend to do that so that I don't have to wait long before posting the release announcements in Discord and LOOT's forum thread.

## Testing

I don't have a Steam Deck, so I relied on a few users who owned one to help test the changes. My own manual testing relied on three environments:

- An Ubuntu 20.04 VM running in Hyper-V, which I use to run Linux builds locally.
- A Manjaro VM running in Hyper-V, which I set up to test running LOOT Flatpak builds against dummy game installs. I chose Manjaro because Valve [suggest](https://partner.steamgames.com/doc/steamdeck/testing) using it to test Steam Deck support. However, I couldn't get Steam to work properly on it (possibly due to the lack of GPU acceleration in Hyper-V?), as Steam's main UI was invisible and Steam would hang on the splash screen after the first launch, hence the dummy game installs.
- An Ubuntu 22.04 partition, in which I installed Steam and Heroic Games Launcher as un-sandboxed and Flatpak applications. I used this sparingly as it's a faff to reboot between Windows and Linux often, but it was invaluable for testing LOOT against real game installs.

I did also try setting up a Steam Deck VM using the recovery image that Valve [provides](https://help.steampowered.com/en/faqs/view/1b71-edf2-eb6d-2bb3), but couldn't get it to work properly using QEMU or KVM.

## Impact

I started working on a Linux release because people couldn't run recent LOOT releases through Wine, but it turns out that a native Linux release isn't a solution for everyone. Users who manage their mods using [Mod Organizer 2](https://www.modorganizer.org/) run it through Wine because it doesn't provide a Linux release, and LOOT needs to launched by MO2 so that it can see the plugins managed by MO2, but that means they need to run LOOT as a Windows application.

Workarounds include using a different mod manager ([Wrye Bash](https://github.com/wrye-bash/wrye-bash) does not yet officially support Linux, but the devs are [working on it](https://github.com/wrye-bash/wrye-bash/issues/243)), or [cross-compiling LOOT from Linux]({{< ref "2023-07-30-cross-compiling-loot" >}}), but otherwise this remains [an unsolved problem](https://github.com/loot/loot/issues/1886). However, I don't think I'd have done anything differently had I been aware of that limitation from the start.

Here are LOOT's download counts for the versions released in the almost two months since the first Linux release of LOOT (at time of writing):

| Source | Build | Download count |
|--------|-------|----------------|
| Flathub | Flatpak application | 1,252 |
| GitHub | Linux archive | 2,708 |
| GitHub | Windows archive | 44,136 |
| GitHub | Windows installer | 82,947 |
| Nexus Mods | Windows installer | 18,400 |

The Linux downloads represent 2.7% of all downloads, which is higher than expected, given that the [Steam Hardware & Software Survey](https://store.steampowered.com/hwsurvey) indicates that ~ 1.4% of Steam users are on Linux. I'm also surprised that the GitHub downloads are more than double the Flathub downloads, as the Flathub download is easier to use and there's a link to it on the GitHub release page. Given the relatively low download counts, it might be that a significant number come from non-users (e.g. web crawlers).

Artificially inflated or not, the numbers show that the Linux build is not popular. Whether it was "worth it" does not have an obvious answer, as I'm not sure how to measure that. I learned a lot about Flatpak, which made me more positive about releasing desktop applications on Linux, and the changes included significant improvements for Windows users too. I don't regret spending the time that I did to get it working and released, and it hasn't been much of a maintenance burden so far.
