---
title: More LOOT Sorting Optimisations
date: 2025-01-22
summary: Picking those low-hanging fruit.
categories:
   - LOOT
---

[LOOT](https://loot.github.io/) is a utility that helps people use game mods for Bethesda's Elder Scrolls and Fallout games. Mods for these games use plugin files to make changes to game data, and LOOT's main feature is sorting the order in which these plugins are loaded by the game to help avoid compatibility issues.

It's been a couple of years since the [last significant optimisations]({{< ref "2023-03-06-loot-sorting-optimisations" >}}) to LOOT's sorting implementation, but I've just merged some more improvements that, while more modest, I think are still worth writing about.

Back in 2023, I managed to make changes that I saw give a performance improvement of 39x, and others (with larger load orders) reported it being up to 246x faster. This time I've only seen a 2x improvement, as a result of a series of small improvements adding up. All the changes were made in [libloot](https://github.com/loot/libloot), the library that provides LOOT's core functionality. The changes haven't been released yet, but you can see the commits in [this comparison view](https://github.com/loot/libloot/compare/7abfc66f8c05176c192e1359a017b6e6bd55a9fc...794e796de829782f07e373021e944bb9e0d1a421).

2023's improvements were motivated by LOOT being unusably slow for people with very large load orders. This time around I started looking for optimisation opportunities because I've implemented a [new approach to handling plugin groups during sorting]({{< ref "2025-01-22-loot-group-sorting" >}}) that is a bit slower than the old approach, and I wanted to offset that before merging the change.

When deciding what to focus on and measuring the impact of individual changes, I ran the Visual Studio profiler on a test function that looked like this:

```c++
TEST(Performance, sortPlugins) {
  auto handle = CreateGameHandle(
      GameType::tes5se,
      std::filesystem::u8path(
          "C:\\Games\\Steam\\steamapps\\common\\Skyrim Special Edition"));

  handle->GetDatabase().LoadLists(std::filesystem::u8path(
      "C:\\Users\\User\\AppData\\Local\\LOOT\\games\\Skyrim Special "
      "Edition\\masterlist.yaml"));

  handle->LoadCurrentLoadOrderState();

  std::vector<std::filesystem::path> pluginPaths;
  for (const auto &plugin : handle->GetLoadOrder()) {
    pluginPaths.push_back(std::filesystem::u8path(plugin));
  }

  auto sortedPlugins = handle->SortPlugins(pluginPaths);

  EXPECT_EQ(pluginPaths.size(), sortedPlugins.size());
}
```

That's using a Skyrim SE install with 1600 plugins and revision `632bbaa` of the Skyrim SE masterlist.

Since the `GameInterface::SortPlugins()` call there first loads plugins and then does the actual sorting using the loaded data, when measuring the impact of my individual changes I actually looked at the `std::vector<std::string> SortPlugins(Game& game, const std::vector<std::string>& loadOrder)` function that is called after loading plugins: that's where the percentages I give below come from.

It's also worth noting that the 2x performance improvement mentioned earlier is based on the timestamps of LOOT debug log messages that correspond to running libloot's `SortPlugins()` function. That result isn't comparable to the improvements measured in Visual Studio: for example, logging isn't enabled in my tests, so they don't pay the cost of that (which can be significant for sorting because it logs so much), but they do pay the cost of VS sampling the code as it runs.

### Constructing esplugin error strings lazily

When libloot needs to access plugin data it calls [esplugin](https://github.com/Ortham/esplugin), and handles errors using a common function that is passed the return code and a context string, like so:

```c++
    const auto ret = esp_plugin_do_records_overlap(
        esPlugin.get(), otherPlugin.esPlugin.get(), &doPluginsOverlap);

    HandleEspluginError("check if \"" + name_ + "\" and \"" +
                            otherPlugin.GetName() + "\" overlap",
                        ret);
```

I noticed that esplugin calls like this were showing significant overhead in the flamegraph. Looking at the code above, it's obvious that we're paying the cost of multiple string concatenations on every function call, even though they never error. I changed it to this:

```c++
    const auto ret = esp_plugin_do_records_overlap(
        esPlugin.get(), otherPlugin.esPlugin.get(), &doPluginsOverlap);

    HandleEspluginError(ret, [&]() {
      return fmt::format(
          "check if \"{}\" and \"{}\" overlap", name_, otherPlugin.GetName());
    });
```

So that the strings are only concatenated if the function passed into `HandleEspluginError` is called, so that's skipped when there's no error. Changing that improved sorting performance by 7%, which isn't bad considering that it was just avoiding obviously completely unnecessary work (it's embarrassing that I wrote it in the first place).

### Avoiding repeated UTF-8 to UTF-16 conversions

In an effort to handle case-insensitive filename comparisons correctly (in situations when they files don't necessarily exist), LOOT has a `CompareFilenames()` function uses Windows' [``CompareStringOrdinal()``](https://learn.microsoft.com/en-us/windows/win32/api/stringapiset/nf-stringapiset-comparestringordinal) function. Unfortunately, as with most (all?) Windows API functions, it takes UTF-16 strings, and LOOT uses UTF-8 internally, which means that `CompareFilenames()` has to first convert the strings using [``MultiByteToWideChar``](https://learn.microsoft.com/en-us/windows/win32/api/stringapiset/nf-stringapiset-multibytetowidechar).

Doing that is very slow, so I added an overload of `CompareFilenames()` that took the wide strings, and in cases during sorting where the same filename may be compared against others multiple times (such as the filenames of the plugins being sorted being compared against filenames in LOOT's metadata) I introduced caching of the wide strings, or in cases where there was a for loop I moved the string conversion out of the loop.

On Linux a conversion to `icu::UnicodeString` (which is also UTF-16) is needed, so I introduced a `ComparableFilename` typedef that's `std::wstring` on Windows and `icu::UnicodeString` on Linux, and added a `ToComparableFilename()` function, so that the same high-level functions can be used on both platforms.

These changes improved sorting performance by 20%, though I only tested on Windows, so I don't know how much of an impact it would have on Linux. It does make the code a little messier, but I think it's worth it.

### Caching and returning a reference to the plugin name string

Plugin sorting uses a `PluginSortingData` class to provide access to the plugin data and metadata that's needed during sorting. Some of this data is held directly in the class's member variables, while some is accessed through pointers to other objects. A plugin's name is stored in its `Plugin` object's `name_` field, and a pointer to that `Plugin` object was stored in `PluginSortingData`. The `name_` field is private, and `Plugin::GetName()` returns a `std::string`, and `PluginSortingData::GetName()` returns the value of `Plugin::GetName()`. In hindsight, `Plugin::GetName()` should probably return a `const std::string&`, since a plugin's name doesn't change, but changing that would break libloot's public API compatibility.

Plugin names are used quite a lot during sorting, and it turned out that storing a copy in `PluginSortingData` and changing its accessor to return it as a `const std::string&` instead of returning a new copy every time improved performance by another 7%.

### Swapping out standard library containers

Most of the time spent sorting is spent checking for paths between vertices, usually to avoid adding edges that would cause a cycle: e.g. if I want to add an edge from A to B, I first check if there is a path going from B to A and only proceed if there isn't one.

Checking for a path is done using a bidirectional breadth-first search (BFS). The search is relatively slow, so as the search walks the graph it caches the paths it finds (e.g. if starting from A it reaches B and C, it'll cache A -> B and A -> C as paths that exist). Adding an edge also caches it as a path, and the cache is checked before starting a search.

There are a few data structures involved with this:

- `std::unordered_set<vertex_t>` is used to store the vertices that have already been visited during a BFS
- `std::queue<vertex_t>` (backed by `std::deque`) is used to store the vertices that have been discovered and not yet searched
- `std::unordered_map<vertex_t, std::unordered_set<vertex_t>>` is used to store the cached paths.

I could see in the flamegraph that a lot of time was being spent inserting into and querying `std::unordered_set`, so knew that speeding that up could have a big impact.

I've long been aware that the `std::unordered_set` and `std::unordered_map` containers are relatively slow compared to other implementations, due to the standard specifying behaviours that disallow faster implementations that have been discovered in the time since the standard was written. Before going ahead with anything complicated, I thought I'd try swapping out those containers, since they're used a *lot* as part of checking for paths.

Since LOOT already uses Boost's graph library, it was easy to start using Boost's unordered containers library:

1. replacing just the `std::unordered_set` objects used by the bidirectional breadth-first search with a `boost:unordered_flat_set` improved performance by 40%
2. replacing the paths cache storage with `boost::unordered_flat_map<vertex_t, boost::unordered_flat_set<vertex_t>>` gave another 31% improvement
3. replacing the `std::unordered_set` used by the wide strings cache that I mentioned earlier with a `boost::unordered_flat_set` gave another 7% improvement.

After these changes the slowest part of the path existence check became interacting with the `std::queue` objects, so I swapped their use of `std::deque` with `boost::container::deque` for another 31% performance improvement.

### Caching plugins' master flag

Like plugin names, whether a plugin is a master file or not is used during sorting, to ensure that master files don't load after non-masters. `PluginSortingData` gets whether a plugin is a master file or not by calling a `Plugin` member function, which calls an esplugin function. That esplugin function call has to check a few things and has a little overhead, and the time that takes adds up.

Since the result is a boolean value that doesn't change, I changed the `PluginSortingData` constructor to retrieve it and store it as a field in the object. That improved sorting performance by another 5%.

### Check for path existence in both directions

As mentioned, when LOOT is trying to avoid creating cycles, before adding an edge it first checks if there's already a path going in the opposite direction: you don't want to add an edge going from A to B if there's already a path going from B to A.

While adding an edge going from A to B won't break anything when there's already a path from A to B, it doesn't really do anything useful (for sorting, anyway) and does make subsequent path checking slower, since there are now more edges to check. As such, it might be faster overall to add the edge from A to B only if there isn't a path between them in *either* direction.

I.e. do this:

```c++
if (!IsPathCached(a, b) && !IsPathCached(b, a) &&
    !PathExists(a, b) && !PathExists(b, a)) {
   AddEdge(a, b);
}
```

instead of doing this:

```c++
if (!IsPathCached(b, a) && !PathExists(b, a)) {
   AddEdge(a, b);
}
```

where `PathExists()` does a bidirectional breadth-first search and returns true if a path is found.

I actually had the idea to do this only after merging the new groups approach, and applied it to when group and overlap edges are added. That improved performance by 19%, more than enough to offset the ~ 10% performance hit of the new groups approach.

I then decided to check what would happen if you didn't search for a path going from A to B and just opportunistically checked the cache for it just in case such a path had already been found, but didn't spend more time looking for it if not. That actually improved performance by another 15%, so the check became:

```c++
if (!IsPathCached(a, b) && !IsPathCached(b, a) && !PathExists(b, a)) {
   AddEdge(a, b);
}
```

Out of curiosity, I went back to the commit that cached the master flags and applied both changes to adding overlap edges (not group edges, because the old groups approach didn't take the same approach to avoiding cycles). Applying the first change gave a 25% performance improvement, while applying the second didn't make a difference, suggesting that there were no (or very few) cache misses for paths that did actually exist.


### Other attempts

There were a few things I tried that didn't end up improving performance:

- After the optimisations above, it was still faster to cache paths than to perform the BFSes every time.
- When checking for path existence in both directions, I tried replacing my two bidirectional breadth-first searches with a single "quad-directional" search that ran both searches in the same loop, which can exit early on the first path found in either direction. I.e. `QuadBFS(A, B)` would be faster than `BiBFS(A, B) || BiBFS(B, A)` if `BiBFS(B, A)` completes before `BiBFS(A, B)`. I did find that it was faster in practice, but not as fast as the combination of checking the cache for both paths and searching for the path in the reverse direction.
- I tried caching paths as a set of pairs of vertices instead of a map of vertices to sets of vertices, i.e. as `boost::unordered_flat_set<std::pair<vertex_t, vertex_t>>`, but it was a little slower.
- The process of adding tie-break edges also uses BFSes to find paths, but it uses the path found so just checking the existing caches isn't enough, and adding caching of the full paths found regresses performance.
- There are still some places in the sorting code that use the standard library's unordered containers, because changing them to use the Boost containers didn't have a noticeable impact on performance.

## Future work

A lot of these improvements were relatively low-hanging fruit, but I more than achieved my aim of improving performance enough to offset the cost of the improved group sorting. User feedback has been that they've also seen a ~ 2x improvement with fewer plugins and a userlist adding a many more groups containing several plugins each, which suggests that the optimisations didn't just pay off for a narrow band of inputs.

There's always more optimisation to be done, but sorting now takes 32% of the execution time of the test case I've been using, with loading the masterlist at 30%, and loading plugins at 31%. While it's still the biggest slice of the execution time, I don't think it's the most significant, because loading and sorting plugins scales with the number of plugins that you have installed, and most users aren't running games with well over a thousand plugins.

As such, I think loading metadata is where I should be focussing my optimisation efforts next. I've got a few ideas for that, but we'll see how they pan out.
