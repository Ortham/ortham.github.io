---
title: Reimplementing LOOT's user interface with Qt
date: 2022-01-15
excerpt: Faster, leaner and (hopefully!) more maintainable.
---

Over the past two months I've reimplemented [LOOT](https://loot.github.io/)'s user interface in [Qt](https://www.qt.io/), and I thought I'd write about why, what changed, some of the problems I encountered, and then finish up with some metrics comparing the old and new UIs.

Before I start, here are a couple of before and after screenshots:

![CEF-based UI](/assets/images/posts/loot-0.17.0.png)
*LOOT v0.17.0's UI*

![Qt-based UI](/assets/images/posts/loot-qt.png)
*LOOT's new Qt-based UI as of commit [6daa98c](https://github.com/loot/loot/tree/6daa98c0e45eddb4d5b37312302592ab4cf476c8)*

## Why?

Back in 2015 I [wrote]({% post_url 2015-05-22-loot-v0.7-ui %}) about migrating LOOT's user interface from [wxWidgets](https://www.wxwidgets.org/) to HTML/CSS/JavaScript running in the [Chromium Embedded Framework](https://bitbucket.org/chromiumembedded/cef/) (CEF). That took a year and ~ 1000 commits, so doing another migration isn't something I'd do *just* for the hell of it. I enjoy learning new things, but there were also some problems with the existing user interface's choice of technologies that I wanted to solve:

* To do UI development you need to know TypeScript, HTML and CSS as well as Node.js tooling like Webpack, Babel and Jest and libraries like Polymer. You also need to know C++, CMake, Google Test and maybe the Chromium Embedded Framework (though changes to that area are infrequent) and the other libraries LOOT uses. It's a lot to learn and then keep on top of.
* There's the usual madness of keeping hundreds of NPM packages up to date, with all the risks that entails. I use GitHub's Dependabot to try to keep on top of dependency updates, but there's just so much churn that it's a real effort to keep on top of everything - Dependabot and CI might be able to help avoid obvious breakage, but there's still other aspects of due diligence that need to be done when updating dependencies.
* The UI makes heavy use of Polymer to implement its elements, and Polymer turned out to be a dead-end technology, making further enhancements and investment in the stack unappealing and maybe more difficult.
* Passing data between C++ and JS involves a fair bit of code to define data structures on both sides and perform the JSON (de)serialisation. [nlohmann/json](https://github.com/nlohmann/json) does a really good job of making the latter ergonomic, but having the interop layer at all is not ideal.
* Shipping and running an entire web browser for one application's UI is inefficient. The resource consumption during runtime isn't really a big issue: yes, the CEF-based UI does use more CPU and memory than the Qt-based UI, but resource consumption hasn't been an issue anyone's mentioned since the CEF-based UI's initial development, and the difference isn't enormous. What's been more of a problem is the size of CEF and how that's increased over time. LOOT v0.7.0 introduced the CEF-based UI and of its 67 MB install size, 61 MB was from CEF. Of LOOT v0.17.0's 184 MB install size, 153 MB is from CEF. That's a lot of growth, and it's hard to trace that to any improvements seen by LOOT.

Given all that, I decided to investigate my options for writing a native UI using an established framework.

### Why Qt?

I briefly considered going fully native and writing the UI in C# with WPF or WinUI, but that would be a lot of work and development would still then involve two languages, for dubious gain. In particular, while P/Invoke does support calling C++ code, its support for C++ types is pretty limited so I wouldn't be able to call libloot functions without writing a wrapper for them. That would involve more work and maintenance than I was willing to do, so I discarded C# as an option.

The other fully native option is C++ with WinUI 3 (I'm ignoring MFC as it seems to be a legacy technology), but it's basically too new (some key UI components are missing) and I frankly really dislike the Fluent design framework it seems to be coupled to:

* Complex UI element layouts to support cases like multitasking don't seem to be supported.
* Everything is too "flat", it's sometimes very difficult to distinguish between different areas on a page.
* Its information density is far too low for a desktop interface (it seems much better suited for phones and touch). LOOT's current UI already suffers from the same problem as a result of following Google's Material Design style guide (which all else aside was at least consistent and easy to follow), and I'd rather avoid the problem if possible.

Having exhausted Microsoft's offerings, I was left with three big established desktop UI frameworks:

* wxWidgets: I'd used wxWidgets 3.0 in the past, and vaguely remembered having a few frustrations with it, and it looked like not much has changed since 3.0. Going back to wxWidgets would probably be fine, but it wouldn't be interesting.
* GTK: I've found it to be an utter pain to set up on Windows, and wouldn't go anywhere near it for an application that's going to be run primarily on Windows.
* Qt: I'd tried a "hello world" type project using QML a couple of years ago, but never used it beyond that, so why not give it a go and learn something new?

## Supporting Windows 7 users

LOOT is currently released as a 32-bit application supporting Windows 7 or later, but the current major version of Qt (6) only supports 64-bit versions of Windows 10 (1809) or later, and the latest version of Qt that supports 32-bit Windows 7 is itself no longer supported except for commercial customers. That's not ideal if we want to retain compatibility for all LOOT's currently supported platforms, but is that still relevant?

LOOT doesn't collect any information about its users, so I don't have any direct statistics on LOOT users' OSes. The [Steam Hardware & Software Survey](https://store.steampowered.com/hwsurvey?platform=pc) is the closest equivalent that I know of, because Steam is by far the most popular platform through which LOOT's supported games are played, and it's the only store that sells them all. Here's what it reported for Windows users in December 2021:

| Windows Version | Percentage |
|-----------------|------------|
| 10 64 bit       | 84.97      |
| 11 64 bit       | 10.55      |
| 7 64 bit        | 3.37       |
| 8.1 64 bit      | 0.70       |
| 7               | 0.20       |
| 10              | 0.09       |
| 8 64-bit        | 0.05       |
| Other           | 0.06       |

That adds up to 99.99%: I assume that's due to rounding errors. By process of elimination, "Other" is a combination of 8 32-bit and 8.1 32-bit, as the Steam client currently requires Windows 7 or later.

So, of Steam's Windows users:

* 95.52% run 64-bit versions of Windows 10 or 11.
* 4.12% run 64-bit versions of Windows 7, 8 or 8.1.
* 0.35% users run 32-bit versions of Windows.

Now, given that Microsoft themselves no longer support Windows 7 or 8 and that 8.1 is in its final year of extended support, I think it's reasonable for Qt and LOOT to drop support for them. While 32-bit Windows is still supported (though it's no longer offered to OEMs as of Windows 10's May 2020 update), hardly anyone uses it and it's on the way out (Windows 11 doesn't have a 32-bit version), so it's an obvious choice to drop for anyone looking to halve the size of their support matrix.

Having said all that, I think ~ 4.5 % of users is a significant percentage and I'd rather not cut them off from future LOOT updates, so long as supporting them doesn't take too much effort. However, I initially developed the UI against Qt 6 and thought that supporting Qt 5 would too much of a headache, so I'd resigned myself to dropping support for that ~ 4.5 % of users.

> A user running 64-bit Windows 7 did test out a Qt-6-based UI and found that it wouldn't run because Qt tries to call an API that doesn't exist. That's a shame, because "unsupported" means something more like "if it doesn't work, we can't help you" than "it definitely won't work", and I had hoped that Qt 6 might run on Windows 7 regardless of the lack of support.

Fortunately, I realised my mistake and found that LOOT didn't need many changes to become compatible with Qt 5, which supports 32-bit and 64-bit Windows 7 or later. The question then became: is there any reason to offer a Qt 6 build given that a Qt 5 build must be provided for maximal compatibility?

The answer is yes, for two reasons that I know of (there are probably more):

- High DPI support in Qt 5 does not work out of the box. Maybe it's possible to get it working, but I tried various options and couldn't get a satisfactory result.
- The Qt Company have [said](https://www.qt.io/blog/qt-6.2-and-windows-11) that Qt 6 will receive updates to resolve issues with Windows 11, but Qt 5 will not. Already more than twice as many Steam users use Windows 11 than use Windows 7, 8, 8.1 or 32-bit Windows 10, so that's significant.

As such, LOOT binaries will be provided for:

- 64-bit Windows 10+, using Qt 6 (the recommended option)
- 32-bit and 64-bit Windows 7+, using Qt 5 (for those that can't use the recommended option)

## Design Changes

LOOT's existing UI design is generally fine, so I didn't want to mess with it much while migrating to Qt. That said, there were a few improvements that I wanted to make:

1. Increase information density. The CEF-based UI isn't great at displaying a lot of information at once (e.g. the sidebar plugins list doesn't display many rows at once) due to trying to conform to Material Design, which likes large UI elements.
2. Use child windows for dialogs. As a single-window UI, the CEF-based UI implements dialogs as elements hovering in front of an overlay. This avoids having to manage multiple windows (which is more complicated for a browser-based UI than in a traditional desktop framework), but it does mean that you can't avoid things overlapping and you can only have two layers of UI. LOOT's original wxWidgets UI suffered from having too many windows, but in retrospect I think one is too few.
3. Avoid buttons on the plugin cards. The cards' content is almost entirely read-only, but one of the icons opens a menu when it's clicked on, and that menu contains items that trigger actions. That inconsistency bothered me, so now all card icons are purely informational and the actions are accessible through the Plugin menu in the menu bar. This change also required changes to what happens on plugin selection in the sidebar, so that selecting a plugin no longer jumps to its card, but I think that's probably a less surprising default anyway.
4. Do *something* about how Bash Tags are displayed. Displaying them isn't useful for most people, and it's clearly not obvious what the text means, because it's a relatively common question from users. In the end I made them hidden by default, moved them below the messages, put them in a group box titled "Bash Tags" so it's obvious what the text is about, and added "Current", "Add" and "Remove" prefixes to help indicate what each line was about. I'm still not completely happy with that approach, but it's an improvement.
5. I've shied away from using buttons that are just icons without any text, to make it easier for users to understand what will happen when the button is clicked.

Aside from that, there were some changes made to reflect the different expecations that users have with a more traditional UI:

* I moved everything from the main toolbar overflow menu into relevant menu bar menus.
* While I really like the look of the combined main toolbar in the CEF-based UI for the sidebar and the main content area, it doesn't really work with native UI controls: something about how the tabs are positioned and their use of space makes the sidebar appear disconnected from the content to its right. As such, I went with a toolbox widget instead as the was quickest and easiest alternative to implement.
* One change that I'm not completely happy with is the move from "toast" notifications that popped up in the bottom left of the window (e.g. when copying metadata) to status bar text: I feel like the latter is too easy to miss. Then again, the notifications are for things that are OK to miss.

## Functional Changes

There were also some functional changes made in the process of implement the Qt-based UI. Many of them are enhancements:

* The settings dialog now allows each game's minimum header version to be configured. Adding an input for that field made it easier to read game settings data from the UI, as it meant all settings could be read from the UI inputs.
* The plugin metadata editor now supports editing multilingual message contents, and this is used for messages' content fields, and for detail fields in other metadata types. In the CEF-based UI, all language strings were selected before being sent to the browser, so the multilingual data would be lost. Because the multilingual data isn't lost when staying in C++, it was easier to add UI elements to represent it than try to deal with the loss as before.
* It's now possible to select and delete mulitple rows of user metadata at once in the plugin metadata editor. This is built-in functionality in Qt's `QTableView`.
* A separate drawing mode is no longer needed in the groups editor. Drawing mode was only introduced in LOOT v0.17.0 to work around a limitation introduced by a change in one of LOOT's JavaScript dependencies, which no longer applies.
* The "Copy Content" Game menu action now copies content as Markdown text instead of JSON data. JSON was used because the data was already readily available in that format, but that's no longer the case, and the Markdown output is more useful.
* The "Copy Metadata" Plugin menu action now copies metadata as YAML that conforms to LOOT's metadata syntax rather than as JSON that does not, and now includes all texts for multilingual messages instead of just the current language's text. This enhancement wasn't directly related to the move to Qt, but afterwards "Copy Metadata" was the only place JSON was still used, and I realised that libloot could provide a better alternative.
* A few menu options now have keyboard shortcuts, as Qt makes it easy to define them.
* The First Time Tips dialog doesn't run if auto-sort is enabled. It's not really related to the move to Qt, but I realised that makes more sense when reimplementing it.

There's also a new "Join Discord Server" link in the Help menu, but it just happened to be added after the Qt UI was implemented.

There were also some changes that were neither enhancements nor regressions:

* As mentioned above, clicking on a plugin in the sidebar now selects it instead of jumping to its card.
* Double-clicking on a plugin in the sidebar now jumps to its card instead of opening the plugin metadata editor for that plugin.
* Themes are still supported, but the implementation is completely different so existing themes need to be recreated (which may not always be possible, depending on what the theme is doing, as Qt's styling support is more limited).
* The game selection dropdown now only lists games that LOOT can detect as installed.

I intentionally removed a couple of pieces of functionality:

* The "Jump To General Information" toolbar button has been removed, as I don't think it's useful enough to warrant a toolbar button vs. just scrolling up to the top of the cards list.
* It's no longer possible to select and move multiple nodes at once in the groups editor. This could be reimplemented, but it's functionality that LOOT got for free from the graph library it was using and I don't currently think it's useful enough to bother reimplementing it.

Unfortunately, there have also been a couple of regressions:

* Messages are parsed as CommonMark instead of GitHub Flavored Markdown (GFM), due to a bug in Qt's GFM parser. It turns out that the masterlists don't actually use any of the features that GFM adds, so this is only a regression for any user metadata that does use GFM's extensions.
* It's no longer possible to select the content of a plugin card (e.g. to copy it to the clipboard). This is due to the different parts of the card being rendered using different `QLabel` elements, so if text selection was enabled you'd only be able to select one bit of text at a time (e.g. the plugin name, or a message, or a list of Bash Tags to add). To mitigate this loss, there's a new "Copy Card Content" action in the Plugin menu that copies the selected plugin's card content as Markdown text.

## Problems

While the process of learning Qt and reimplementing the UI was generally fairly smooth, I did hit a few stumbling blocks that I ended up spending many hours on. I've written separate posts about two of those stumbling blocks:

* [Custom interactive list elements with Qt]({% post_url 2022-01-15-qt-view-delegates %})
* [Horizontal text in themeable vertical tabs with Qt]({% post_url 2022-01-15-qt-vertical-tabs %})

## Metrics

To finish up, here are some before/after metrics for the CEF-based and Qt-based UIs. Unless otherwise noted, the numbers for the CEF-based UI come from the [0.17.0](https://github.com/loot/loot/releases/tag/0.17.0) release, and the numbers for the Qt-based UI come from commit [6daa98c](https://github.com/loot/loot/tree/6daa98c0e45eddb4d5b37312302592ab4cf476c8).

Note that the dependencies and lines of code counts are affected by also rewriting the LOOT repository's helper scripts from Node.js to Python, which meant that Node.js usage could be dropped entirely (since it wasn't being used to build the UI any more). The scripts were only a few hundred lines long and only used a couple of JavaScript dependencies though, so the impact isn't very significant.

### Lines of code

Lines of code counts are generally pretty meaningless, but you can see the shift in languages used. Here's the output from [tokei](https://github.com/XAMPPRocky/tokei):

CEF-based:

```
===============================================================================
 Language            Files        Lines         Code     Comments       Blanks
===============================================================================
 Autoconf                1           38           28            1            9
 C Header               71         8875         5681         1793         1401
 CMake                   1          403          320           34           49
 C++                    15         3854         2805          498          551
 CSS                     3          576          481           59           36
 JavaScript              6          519          426           26           67
 JSON                    5        21993        21993            0            0
 PowerShell              2           55           50            0            5
 Python                  1          350           40          235           75
 ReStructuredText       15         2223         1711            0          512
 Shell                   1           48           32           10            6
 SVG                     1          565          563            1            1
 Plain Text             14         1325            0         1102          223
 TSX                     1          230          183            9           38
 TypeScript             39        12204         9972          362         1870
-------------------------------------------------------------------------------
 HTML                    1          480          461           17            2
 |- CSS                  1          103           89            4           10
 (Total)                            583          550           21           12
-------------------------------------------------------------------------------
 Markdown                2          232            0          152           80
 |- YAML                 1            9            9            0            0
 (Total)                            241            9          152           80
===============================================================================
 Total                 179        53970        44746         4299         4925
===============================================================================
```

Almost all of those JSON lines are from `package-lock.json`...

Qt-based:

```
===============================================================================
 Language            Files        Lines         Code     Comments       Blanks
===============================================================================
 Autoconf                1           38           28            1            9
 C Header               77         8877         5510         1918         1449
 CMake                   1          366          290           31           45
 C++                    45        12460         8869         1411         2180
 PowerShell              2           57           52            0            5
 Python                  4          592          214          246          132
 ReStructuredText       15         2220         1717            0          503
 Shell                   1           40           30            6            4
 SVG                    24          597          595            1            1
 Plain Text              7         1317            0         1091          226
 TOML                    1           82           39           41            2
-------------------------------------------------------------------------------
 Markdown                2          229            0          150           79
 |- YAML                 1            9            9            0            0
 (Total)                            238            9          150           79
===============================================================================
 Total                 180        26875        17344         4896         4635
===============================================================================
```

### Number of direct dependencies

| Language                | CEF | Qt |
|-------------------------|-----|----|
| C++                     | 9   | 8  |
| JavaScript / TypeScript | 82  | 0  |

This hides the true scale of the difference in size of the dependency tree, as there are hundreds of indirect JavaScript dependencies and only a few indirect C++ dependencies due to differences in culture and tooling between the two languages.

Personally, I don't think having many dependencies is an issue in and of itself, but having more dependencies does make maintenance more difficult (especially in a fast-moving ecosystem like JavaScript's), and having to trust more third parties makes you more vulnerable to supply chain attacks. I'd say it's better to use high-quality libraries to problems than to roll your own solutions (unless you can better meet your specific requirements), but it's still good to try to keep the dependency tree small.

### Artifact size

| Artifact  | CEF (32-bit) / MB | Qt 5 (32-bit) / MB | Qt 6 (64-bit) / MB |
|-----------|-------------------|--------------------|--------------------|
| Archive   | 68.3              | 17                 | 18.8               |
| Installer | 65.9              | 18                 | 20.5               |
| Install directory | 184       | 57                 | 65                 |

Those could probably be smaller still, as I'm not convinced that the bundled `D3Dcompiler_47.dll` and `opengl32sw.dll` are actually required and they take up about a third of the total install directory size...

Artifact size isn't just important to avoid wasting users' time and bandwidth when downloading LOOT: earlier this year we had to migrate our artifact store away from Bintray because it closed down, and the amount of storage available for free meant we had to drastically cut down on the number of builds we could store artifacts for. Builds being three times smaller means we have the flexibility to go with providers that offer less space but perhaps better features, or simply store three times as many artifacts.

### Memory usage

This is the total memory usage when LOOT is idling after having been launched:

| Game                              | CEF (32-bit) / MB | Qt 5 (32-bit) / MB | Qt 6 (64-bit) / MB |
|-----------------------------------|-------------------|--------------------|--------------------|
| Morrowind, 12 plugins, 2 messages | 81                | 11                 | 13                 |
| Skyrim, 410 plugins, 52 messages  | 110               | 36                 | 47                 |

The CEF UI also has an average background CPU usage of ~1%, while the Qt UI's background CPU usage is 0%.

### CI time

| Build   | CEF / s | Qt / s |
|---------|---------|--------|
| Linux   | 1344    | 483    |
| Windows | 1001    | 454    |

CI timings are highly variable, but these ratios are exemplary of the general spread of values I've seen.

As an open-source project, LOOT uses GitHub Actions for free CI, so time isn't (my) money, but it's still good to use less resources and have faster turnaround times.

Having faster CI times when moving code from TypeScript to C++ might seem unexpected, but the savings are due to the following, from highest impact to lowest:

* Building the archive and installer is much faster because there's much less data to compress.
* Running Webpack to build the TypeScript side of the UI took ~ 30 seconds.
* Linting TypeScript took ~ 20 seconds, and the build doesn't run a C++ linter.
* Using CEF involves building the CEF wrapper library, which contains a lot more C++ than LOOT does, so the total amount of C++ that gets built has actually decreased. While the speed of C++ compilation varies wildly with the kind of code being compiled (e.g. templates are slower to compile) and I don't have a breakdown to confirm the timings, I think this is largely responsible for the remaining delta when running CMake in both builds.
* the new UI has fewer tests to build and run (which isn't a good thing, I've just been lazy)

### Startup time

During the course of developing the Qt UI, I noticed that a lot of LOOT's startup time was being spent in libloot constructing `std::regex` objects, and caching them resulted in a big performance improvement. This optimisation was included in libloot v0.17.3.

The Qt UI is much quicker to load its data even when the CEF-based UI is also using the faster libloot, as the table below shows.

| Game   | CEF / s | CEF with libloot v0.17.3 / s | Qt with libloot v0.17.3 / s |
|---------|-------|------|-----|
| Skyrim, 410 plugins, 52 messages | 3.77 | 3.01 | 1.45 |

The timings above don't tell the full story though, as they don't include the time it takes for the UI to finish loading. I timed that using a stopwatch, from launching LOOT by hitting Enter with the executable selected, to the startup progress bar closing and the plugin lists being populated.

| Game   | CEF with libloot v0.17.3 / s | Qt with libloot v0.17.3 / s |
|---------|-------|------|
| Morrowind, 12 plugins, 2 messages | 1.64 | 0.75 |
| Skyrim, 410 plugins, 52 messages | 3.66 | 2.48 |

Not quite as fast as the logged startup time, but still a bit snappier!

## Conclusion

When I started reimplementing LOOT's UI in Qt, I wasn't sure if I'd succeed or if I'd hit some roadblock that would cause me to abandon the attempt, so I'm very happy to have ended up with a feasible replacement for the CEF-based UI that:

* has almost all the same functionality
* only requires knowledge of C++ and Qt
* replaces over 80 separate direct dependencies with just one
* uses about a third as much space
* uses less than half as much memory
* takes half as much time to build from a clean state.

While I don't think the new UI looks as good as the old UI, I think it's more functional, and I think the looks can be tweaked over time. One of the big benefits of Material Design for me was that it was a simple guide to producing a UI that at looked good (or at least consistent and coherent), which I don't think is *quite* the case for the new UI.

I find it very difficult to take a UI from functional to attractive: it's very fiddly and I don't know what it is about good UIs that makes them good so it's a case of endless experimentation. I've sunk a lot of time into building the Qt-based UI over the past two months, so I think it's time to stop fiddling, leave it alone, and come back to it with fresh eyes at some point in the future.
