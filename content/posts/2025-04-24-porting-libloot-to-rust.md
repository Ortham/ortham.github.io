---
title: Porting libloot from C++ to Rust
date: 2025-08-01
summary: A tale of productive procrastination.
---

[libloot](https://github.com/loot/libloot) is a library that provides the ability to get and set the plugin load order for supported games (mostly Bethesda’s Elder Scrolls and Fallout games), as well as access some of their data and get and set [LOOT](https://github.com/loot/loot) metadata. It's used by LOOT and some other modding utilities.

While libloot has been written in C++ since its origin in 2013, some of its components and dependencies have been ported to Rust since then:

- in October 2017 I replaced my C++ [libespm](https://github.com/Ortham/libespm) library with my Rust [esplugin](https://github.com/Ortham/esplugin) library, and ported [libloadorder](https://github.com/Ortham/libloadorder) from C++ to Rust
- in October 2018 I extracted the condition parsing and evaluation code out of libloot and reimplemented it in Rust as the [loot-condition-interpreter](https://github.com/loot/loot-condition-interpreter) library.

In the years since, I've had an unpublished Git repository where I've toyed with reimplementing parts of libloot in Rust, e.g. writing parts of the sorting logic using [petgraph](https://crates.io/crates/petgraph), but there hasn't really been a compelling reason to explore that further.

Honestly, that hasn't really changed, but earlier this year I found myself wondering again how feasible it would be to reimplement the entirety of libloot in Rust. Unfortunately the only way to know for sure is to do the work. 😒 I'd probably just gotten into another fight with CMake, and was almost certainly procrastinating on doing something else, but in any case I decided to give it a go.

I ended up:

- reimplementing all of libloot's functionality in Rust, with an idiomatic public Rust API equivalent to its existing public C++ API
- creating a C++ wrapper around that Rust library which could be used as a drop-in replacement for the latest libloot release
- creating experimental Python and Node.js wrappers.

This post focusses on that first bullet point, as it's long enough without covering the wrappers!

## The approach

To give a sense of the scale of the task, libloot v0.27.0 (the last release of the C++ codebase) has about 16k lines of C++ code (as measured by [tokei](https://github.com/XAMPPRocky/tokei), excluding comments and blank lines), so it's a fairly small library, but not small enough for a rewrite to be trivial.

A sensible approach to rewriting a codebase would be to reduce the risk of introducing new bugs by swapping out implementations while retaining interfaces, so that existing tests can be run against the new code. Unfortunately, that has the notable downsides of being slow and boring. It doesn't help that interoperation between C++ and Rust is relatively fiddly, or that libloot has relatively few independent internal components.

What I did was to create a new Git repository to hold the Rust code, and open it and the C++ codebase side-by-side, then rewriting the C++ code file-by-file taking a bottom-up approach. Eventually I pulled the new Git repository's main branch into the existing Git repository as an orphan branch, and then merged it into the existing repo's master branch, replacing the C++ code there.

What I didn't do is convert any tests as I went, because I started off aiming to produce a proof-of-concept of a drop-in replacement for the shared library that LOOT uses, so it didn't matter if the details were a bit buggy.

In hindsight, I procrastinated on writing the tests for too long, which meant I had an incredibly tedious time converting around ~ 390 tests in one go. Also, since then I've found that tools like GitHub Copilot can handle most of the fairly mechanical transformation from C++ to Rust with reasonable success, which could have spared me a lot of the tedium (and which would have probably also sped up the initial conversion of the library code).

I was surprised to find that the two codebases ended up with roughly the same number of lines of code, as Rust doesn't need declarations to be duplicated in header files, but that was countered partly by the Rust code having more error handling code. I don't think that Rust error handling is necessarily more verbose, but while the C++ code defines a couple of exception types, I decided to take a very granular approach with the Rust error types, resulting in about 30 of them (most not publicly exposed). I like the end result, but it does involve more code.

## Implementation differences

Rewriting code in a different language with its own syntax, features, idioms and APIs introduces a lot of obvious and relatively mechanical differences. What's more interesting is that because different languages are designed with different goals in mind, they often impose different constraints. Differences between the language ecosystems can also affect what code you need to write and what you can reuse.

While rewriting libloot I found that the process was generally a pretty straightforward translation, but there were a small number of cases where I ended up taking a different approach - sometimes because I was forced to, and sometimes because that was the path of least resistance.

### Interfaces

The C++ public API exposes `GameInterface`, `DatabaseInterface` and `PluginInterface` pure abstract classes. They're used to provide the ability to change data fields without breaking ABI compatibility and to hide the implementation details (and not for polymorphism), but in hindsight I've broken compatibility far more by changing the interfaces than by changing their implementations. The PImpl idiom provides an alternative approach to the same goals, though I'm really not a fan of its extra complexity.

The Rust public API exposes `Game`, `Database` and `Plugin` structs instead. Trait objects would be the closest equivalent to the C++ API, but since Rust doesn't have a stable ABI (outside of FFI), it's simpler to just use structs. Their implementation details are hidden using Rust's module and visibility systems.

The C++ `PluginSortingInterface` pure abstract class is used internally to abstract the sorting logic from the loading of data from plugin and metadata files. In the Rust code it was replaced with a `SortingPlugin` trait, which is used as a generic bound rather than a trait object, which means I don't need to handle the (non-existent) possibility of trying to compare objects of different types. Doing something similar in C++ with templates would also be possible but messier due to the use of header files.

### Fighting the borrow checker

Rust achieves memory safety by enforcing constraints on how variables referenced, and this meant that there were a few cases where the Rust compiler rejected the approach I'd taken in the C++ code:

- During plugin sorting, references to plugin graph nodes are held while adding new edges to the graph, which isn't allowed because referencing a graph node involves taking a shared reference to the graph, while adding a new edge involves taking a unique reference to the graph.

  Ideally the Rust compiler would be able to see that adding an edge cannot affect the weight of (i.e the application-specific metadata associated with) a node, and so allow a reference to the weight to be held while an edge is added, but that's a pretty big ask.

  Since the node data is effectively read-only, I worked around this by wrapping the node data struct in `Rc` (a reference-counted smart pointer) and copying the `Rc` objects instead, which is simple and doesn't noticeably impact performance.
- LOOT uses libloot to load plugins and metadata in parallel. In the C++ interface you'd call `GameInterface::LoadPlugins()` in one thread and `GameInterface::GetDatabase()` followed by `DatabaseInterface::LoadMasterlist()` (or a similar function) in another thread.

  In the Rust code that translates to `Game::load_plugins()`, `Game::database()` and `Database::load_masterlist()`, but where `GameInterface::GetDatabase()` returns a `DatabaseInterface&`, `Game::database()` returns an `Arc<RwLock<Database>>` to satisfy Rust's thread-safety requirement.

  I don't count this as a limitation of Rust, as the C++ implementation is technically not thread-safe (you can cause data races depending on how you use the public API).
- The C++ and Rust implementations both have some state related to metadata condition evaluation that is read and written by both the game and database handles (i.e. `GameInterface`/`DatabaseInterface` or `Game`/`Database`). In the C++ interface that state is held by a `std::shared_ptr<>` object that both handles have a copy of, but that technically allows data races. In the Rust code the state is owned by the `Database` struct, so the game handle needs to acquire a lock through its `Arc<RwLock<Database>>` in order to access the state, preventing data races.

  This approach means that when loading plugins and metadata in parallel, loading plugins gets blocked by loading metadata, but the only part of loading plugins that gets blocked is updating the metadata evaluation state, which is the last thing that happens.

  The advantage of this approach over sharing ownership (e.g. through a shared pointer to a mutex that owns the state) is that it allows the database handle to have lock-free access when it evaluates metadata conditions, which happens much more frequently than plugin loading.
- The Rust public API initially returned plugin objects as `Option<&Plugin>`, but then I found that the Python wrapper really doesn't like returning references, presumably because the reference lifetime is unmanageable in the context of Python's garbage collector. I resolved this by returning the plugin objects as `Option<Arc<Plugin>>` instead. I assume that the Node.js wrapper would have had the same issue, but it didn't exist at the time.

Aside from those I don't recall any significant difficulty making the compiler happy, as my C++ code was already generally structured in ways that the Rust compiler would accept. I know that you can have a very different experience if you have a codebase that relies more heavily on things like self-referential structs or cyclic data structures, but libloot doesn't use such things.

### Limitations with substrings and slice windows

Rust strings are encoded using UTF-8, and if you want to get a substring from a string, you must ensure that the substring is valid UTF-8. This is enforced in a few ways:

- slicing using the indexing operator will panic if you slice within a UTF-8 sequence.
- alternatively, there are methods that will return their output value wrapped in an `Option`, using the `None` value to represent when the operation would have otherwise panicked.
- finally, there are `unsafe` methods that make you responsible for ensuring you are not slicing within a UTF-8 sequence, using them is usually a bad idea.

There were two places where this had an impact: when trying to match BSAs to plugins, and when splicing a prelude into a masterlist when loading them. In C++ I just slice and dice as I wish, but doing that in Rust invites panics or excessive boilerplate to handle sequences of operations that are provably fine. For example, if you find a substring and then split on its starting index while avoiding the indexing operator, the split's return value requires you to handle the case where the index was not on a UTF-8 sequence boundary, but you know that can't happen because it represents the start of a substring.

The standard library's string splitting and trimming functions helped to express operations without panicking or having to handle these obviously impossible error cases, but I still found a couple of gaps: a version of `str::find()` that could find a substring that matched one of multiple possibilities (e.g. by taking a closure with a `str` parameter) would help, as would a `str::split_inclusive_once()` function (there's already `str::split_once()` and `str::split_inclusive()`).

Similarly, when sorting the load order there are a couple of places where I iterate over the nodes in the plugin graph and operate on the current and next nodes. In the C++ code I just use `std::next()` to advance the iterator without modifying it, and while I could do something similar in the Rust code, there's a `slice::windows()` function that takes a window size and better expresses what I'm doing. However, it returns an iterator that produces slices, not arrays, so I've then got to validate that the slice contains the correct number of elements, despite the function's documentation saying that it always does. I'm pretty sure this is because the function is older than Rust's ability to use const generics to prove that sort of thing at compile time, but unfortunately the `slice::array_windows()` function (that iterates over arrays instead of slices) is not available in stable Rust.

### Sorting optimisations

The Rust library's load order sorting performance was initially slower than in the C++ code, and I had two possible causes in mind:

1. Sorting makes heavy use of `HashSet` and `HashMap`. Their default hashing function is relatively slow for small keys, and sorting almost exclusively uses 32-bit integer keys. In contrast, the C++ code uses `boost::hash` as its hashing function, and its [documentation notes](https://www.boost.org/doc/libs/master/libs/container_hash/doc/html/hash.html) that:

   > In particular, boost::hash has traditionally been the identity function for all integral types that fit into std::size_t, because this guarantees lack of collisions and is as fast as possible.

   It's also worth noting that the Boost.Unordered containers that the C++ sorting code uses [don't](https://www.boost.org/doc/libs/master/libs/unordered/doc/html/unordered/rationale.html#rationale_hash_function) use the `boost::hash` output directly.
2. As an optimisation, the C++ sorting code uses a linked list to store the new load order during tie-breaking as that can involve a lot of inserts throughout the container as the new load order is built up. Rust's `std::collections::LinkedList` doesn't support inserts (I don't know why it exists: efficient inserts is one of the only reasons you'd want to use a linked list) so a `Vec` is used instead, making those inserts more costly.

I tried replacing the Rust code's hashing function with an identity function equivalent to `boost::hash`, and with a few alternatives:

| Hash function                                     | Sorting performance / % |
|---------------------------------------------------|-----|
| `std::hash::DefaultHasher`                        | 100 |
| Identity function                                 | 87  |
| [ahash](https://crates.io/crates/ahash)           | 131 |
| [fnv](https://crates.io/crates/fnv)               | 133 |
| [rustc-hash](https://crates.io/crates/rustc-hash) | 137 |

I was surprised to see that the identity function gave worse performance than the default hash function. I suspect that `std::collections::HashMap` expects hash values to be well-distributed for optimal bucketing, which sorting's integer keys are not: they start at zero and go up to the number of plugins you have installed (which is practically up to a few thousand) while the hashes are 64-bit values.

`rustc-hash` gave the best result and is a low-risk dependency (as the name suggests, it's used by the Rust compiler). Sorting was 15% faster with it than in the C++ implementation, so I didn't bother investigating whether using a third-party linked list would be beneficial.

### Metadata message substitution

LOOT's metadata supports substituting values into message placeholders, which is useful for defining a generic message and then reusing it with different substitutions. For example, when combined with YAML merge keys:

```yaml
- &genericMissingRequirement
  type: warn
  content: '{0} requires {1} but it is missing!'

- <<: *genericMissingRequirement
  subs:
    - 'A dependent mod'
    - 'a dependency'
```

is equivalent to:

```yaml
- type: warn
  content: 'A dependent mod requires a dependency but it is missing!'
```

In C++ that's implemented using [fmt](https://fmt.dev/)'s support for dynamic formatting arguments, but while the syntax is compatible with Rust's `format!` macro, that requires the format string and number of arguments to be known at compile time (C++20's `std::format` has the same limitation).

While there are Rust libraries that provide the necessary functionality, adding a dependency just for this felt like overkill, so instead I wrote [a formatting function](https://github.com/loot/libloot/blob/0.28.0/src/metadata/message.rs#L321-L388) that does the job.

### Comparing path components

When checking if a given plugin loads a given BSA or BA2 archive file, the check can involve the archive filenames starts with the plugin's basename (i.e. the filename without the file extension). In C++ the way I did this was was essentially:

```c++
bool loadsArchive(const std::filesystem::path& pluginPath,
                  const std::filesystem::path& archivePath) {
  const auto basenameLength = pluginPath.stem().native().length();
  const auto pluginExtension = pluginPath.extension().native();

  const auto bsaPluginBasename = archivePath.filename().native()
    .substr(0, basenameLength)
  const auto bsaPluginFilename = bsaPluginBasename + pluginExtension;
  const auto bsaPluginPath = pluginPath.parent_path() / bsaPluginFilename;

  return areFilePathsEquivalent(pluginPath, bsaPluginPath);
}
```

Aside from possibly being overcomplicated[^overcomplicated-case-insensitivity], this is problematic because there's no guarantee that `bsaPluginBasename` is a valid string in the OS's native filesystem path encoding. For example, if the encoding is UTF-8, it might end part of the way through a codepoint's byte sequence. The C++ standard leaves the behaviour in that case [explicitly unspecified](https://eel.is/c++draft/fs.path.type.cvt).

[^overcomplicated-case-insensitivity]: The current approach stems from an attempt to consistently rely on the filesystem to handle case sensitivity or insensitivity correctly when looking up file paths. In hindsight I'm not sure it worked out all that well, and I might change it in the future, but for the purposes of the translation into Rust that's the way it is.

The Rust version looks a bit like this:

```rust
fn loads_archive(plugin_path: &Path, archive_path: &Path) -> bool {
    let Some(plugin_stem_len) = plugin_path
        .file_stem()
        .and_then(OsStr::to_str)
        .map(str::len)
    else {
        return false;
    };
    let Some(plugin_extension) = plugin_path
        .extension()
        .and_then(OsStr::to_str)
    else {
        return false;
    };

    archive_path.file_name()
        .and_then(OsStr::to_str)
        .and_then(|s| s.get(..plugin_stem_len))
        .map(|f| plugin_path.with_file_name(format!("{f}.{plugin_extension}")))
        .is_some_and(|p| are_file_paths_equivalent(&p, plugin_path))
}
```

Unlike C++, Rust doesn't allow you to create arbitrary substrings of path components, unless you use `unsafe` APIs (in which case you are promising the compiler that you're following the [safety rules](https://doc.rust-lang.org/std/ffi/struct.OsStr.html#method.from_encoded_bytes_unchecked)), or first convert to a UTF-8 string, modify the converted string, and then convert back. The code above takes the latter approach.

Either way, it's a fallible process, as Rust explicitly requires that the truncation position lies on a valid substring boundary, and if converting to UTF-8 first that can also fail (paths can be almost-arbitrary byte sequences on some platforms). Unlike C++, Rust requires the fallibility to be acknowledged in some way: given the domain I don't think the conversion to UTF-8 failing is a realistic scenario, which is why they get treated as `false` results rather than an error to be propagated.

### Regular expressions

libloot matches plugin metadata objects to plugins using a name field that can either be an exact plugin name or a regular expression that may match multiple plugins. libloot v0.27.0 uses C++'s `std::regex` with the `icase` and `ECMAScript` flags.

Rust's standard library doesn't include regex support, but the [regex](https://crates.io/crates/regex) crate is the de facto standard option, even sitting within the Rust project's GitHub organisation. However, it and `std::regex` support different functionality:

- `std::regex`'s behaviour is locale-dependent, while `regex` is not.
- `std::regex` is not Unicode-aware, but `regex` is Unicode-aware by default and supports lots of Unicode-related functionality. This causes many differences in matching behaviour (e.g. making `\s` match additional Unicode whitespace characters), but I *think* those disappear if using `regex::bytes::Regex` with Unicode mode disabled.

  From what I've seen, the only change affecting syntax that `std::regex` accepts is that `std::regex` accepts `[` as a literal inside a character class, while `regex` requires it to be escaped even when Unicode mode is disabled.
- `regex` supports more character escapes than `std::regex`, though I think the only clashes are that the former treats `\<` as a start-of-word boundary assertion and `\>` as an end-of-word boundary assertion, but they're treated as literal `<` and `>` by the latter.

  The only escapes that `std::regex` supports but `regex` does not are `\0` and `\cX` where X is in `[A-Za-z]` (i.e. control character escapes).

  None of these discrepancies are a problem given that `<`, `>`, nul and other control characters can't appear in Windows filenames.
- `std::regex` supports positive and negative lookahead, but `regex` does not.

The [fancy-regex](https://crates.io/crates/fancy-regex) crate reuses some of `regex`'s internals and adds support features including lookaround, but doesn't support disabling Unicode mode (the regex builder has an option to do so, but it just causes an error).

A third option is [regress](https://crates.io/crates/regress), which targets the ECMAScript regex flavour, with a few missing pieces. Compared to `regex` and `fancy-regex`, it does support the `\0` character escape and lookaround and similarly doesn't support control character escapes, but additionally doesn't support POSIX character classes, modifiers and some Unicode character classes. It supports the `u` (Unicode) and `v` (Unicode Sets) flags, but mostly behaves as if the `u` flag is always set to avoid some of ECMAScript's stranger non-Unicode behaviours (many of which aren't present in C++'s modified ECMAScript flavour).

Unfortunately there's no perfect fit for `std::regex`'s behaviour, so something has to give. I had a look at what functionality was used in LOOT's masterlists:

- Unescaped `[` never appears in character classes
- POSIX character classes are never used
- There was one use of negative lookahead in the Skyrim SE masterlist, but it turned out to be unnecessary so [I removed it](https://github.com/loot/skyrimse/commit/3d1a3c9454df13dd0e43e614d9e4ec44e06e2667). There were no other uses of lookaround
- There were 7 non-ASCII plugin filenames, 1 of which was a regex plugin filename.

That's across 15,593 plugin metadata entries, 2,181 of which are regex entries.

Of course, even if something doesn't appear in the masterlists, user metadata might include a regex that uses it, but masterlist metadata is provided by users, so something not appearing in the masterlists indicates that it's highly unlikely to be part of a user's metadata.

I decided to use `fancy-regex` rather than `regex`, prioritising lookahead support over Unicode-unaware behaviour, as it's having a feature vs. having a limitation, and it's easier to adjust to not having the limitation (though on the flip side, unsupported syntax is a more obvious change in behaviour). I chose `fancy-regex` over `regress` because the former's internals have seen far more real-world use thanks to being shared with `regex`, so I thought they'd be more likely to be reliable.

### Parsing & emitting YAML

The YAML library I've used doesn't support merge keys, so I implemented them myself as a step between parsing the YAML and converting the parsed YAML to LOOT metadata data structures. That's not too different from the situation in C++, where I [forked yaml-cpp](https://github.com/loot/yaml-cpp) to add support for merge keys.

The library also doesn't support the YAML serialisation features that libloot needs, which are mostly around how the YAML is formatted, so I implemented a YAML serialiser myself, which is fortunately not too difficult when dealing with a small set of known input data structures and a fixed output style. Even so, I found the rules about which string styles support which characters and which need to be escaped quite difficult to understand.

### Parsing BSA & BA2 files

The C++ code parses BSA and BA2 file data directly from an input stream into data structures, by reinterpreting pointers to those data structures as pointers to byte buffers. That only works if a bunch of assumptions about the data and those structures are true, so Rust doesn't let you do that safely: instead I parse the data into an intermediate buffer and then convert from its bytes into the correct data types for the data structures' fields and set them individually. There are ways to avoid that intermediate buffer, but it would have made the code more complicated, and it's not something that has a significant performance impact.

When implementing this I ran into an annoying limitation in Rust's expressiveness: there's no way to directly and infallibly destructure an array into sub-arrays. By that I mean if given a `&[T; N]`, I'd like to get a `&[T; A]`, `&[T; B]` for any value of `A` and `B` so long as `A + B = N`. Ideally there would be some syntax to allow the creation of up to `N` sub-arrays (if there were `N` they'd each be one element long) of varying length, but you can do that in multiple steps so long as you can split the array in two and get two sub-array references.

While it's not part of the language or standard library, it's possible to implement this using `unsafe`, and the [arrayref](https://crates.io/crates/arrayref) crate does. However, since I'm only working with a few small arrays (up to 32 bytes), I ended up destructuring the arrays into their individual bytes, and then creating new arrays from the appropriate bytes. It's more verbose and more prone to typo-based bugs than using `arrayref`, but it avoids adding another dependency, doesn't require any `unsafe` code, and the destructuring and use of those variables are very close together so it's easy to check that they're correct.

### Logging

libloot's public C++ API has a `SetLoggingCallback()` that allows a callback to be provided that will then be invoked whenever libloot logs anything. LOOT uses it to write libloot log output to its log file.

The public Rust API has an equivalent `set_logging_callback()`, but libloot also logs using the [log](https://crates.io/crates/log) crate to provide more idiomatic logging for Rust applications that use a compatible logger. One advantage of the `log`-based logging over `set_logging_callback()` is that the latter will only invoke the callback for messages logged by libloot itself, while the former will also propagate log messages from libloot's dependencies.

Ideally it would be possible to invoke the callback for any messages logged using `log`, but that would require setting the global logger (i.e. what actually writes the log messages somewhere), which can only be done once, and so it would be problematic if you happened to use libloot's `set_logging_callback()` in an application that tried to also set the global logger elsewhere.

The main alternative to `log` is [tracing](https://crates.io/crates/tracing), which provides more functionality, but while it does allow you to compose multiple subscribers (its term for what writes the log messages) into one global subscriber, it doesn't allow you to set multiple independent global subscribers, so it wouldn't help in this situation.

I chose to use `log` because it's simpler and I didn't feel limited by it (aside from the global logger situation) and there are compatibility layers for converting between the two, so libloot using `log` doesn't stop its logs from being written by an application that uses a `tracing`-based subscriber to write logs.

### Parameterized tests

The C++ code uses [Google Test](https://github.com/google/googletest) as its automated testing framework. Many of the tests are parameterised on a `GameType` enum parameter so that functionality can be tested across all of the games that libloot supports.

While Rust has built-in support for tests, that doesn't cover parameterized tests. While I initially used the [rstest](https://crates.io/crates/rstest) framework to support parameterized tests, it's overkill for my needs and pulls in a lot of additional dependencies, so I replaced it with [a couple of procedural macros](https://github.com/loot/libloot/blob/0.28.0/array-parameterized-test/src/lib.rs) that I wrote (which was my first time writing proc macros). Using the macros looks like this:

```rust
#[test_parameter]
const ALL_GAME_TYPES: [GameType; 11] = [
    GameType::Oblivion,
    GameType::Skyrim,
    GameType::Fallout3,
    GameType::FalloutNV,
    GameType::Fallout4,
    GameType::SkyrimSE,
    GameType::Fallout4VR,
    GameType::SkyrimVR,
    GameType::Morrowind,
    GameType::Starfield,
    GameType::OpenMW,
];

#[parameterized_test(ALL_GAME_TYPES)]
fn should_succeed_if_given_valid_game_path(game_type: GameType) {
    let fixture = Fixture::new(game_type);

    assert!(Game::new(fixture.game_type, &fixture.game_path).is_ok());
}
```

There are other parameterized testing libraries on crates.io, but I couldn't find any that supported concisely using the same inputs across multiple parameterized tests. I've published this one as [array-parameterized-test](https://crates.io/crates/array-parameterized-test).

## Unsafe code

Rust's most significant feature is probably its claim of ensuring memory safety without garbage collection, but [unsound](https://doc.rust-lang.org/nightly/reference/behavior-considered-undefined.html?highlight=soundness#r-undefined.soundness) `unsafe` code (that is, code that the compiler trusts to uphold invariants that it doesn't actually uphold) can cause memory unsafety. Writing sound `unsafe` code can be very tricky (more than writing C or C++ that avoids undefined behaviour), so it's best to avoid writing it if at all possible.

In libloot (excluding the C++ wrapper) there's [only one use](https://github.com/loot/libloot/blob/0.28.0/src/archive/find.rs#L156) of `unsafe`, and that's when checking if two paths reference the same file on Windows. Unlike in C++, the standard library doesn't provide that functionality (though that'll change if the [windows_by_handle](https://doc.rust-lang.org/std/os/windows/fs/trait.MetadataExt.html#tymethod.volume_serial_number) feature ever stabilises). As such, I have to call a Windows API function to get the necessary data, and the `windows` crate doesn't provide a safe wrapper around it. There are other libraries that do, but they're not worth pulling in for a single unsafe function call. I've run my safe wrapper's tests through [Miri](https://github.com/rust-lang/miri) to give more assurance that I've not done something wrong.

There's also unsafe code in some of libloot's dependencies. I took a look through those dependencies and found that many were trustworthy libraries, though I did open a [pull request](https://github.com/zonyitoo/rust-ini/pull/143) to remove the `trim-in-place` dependency from `rust-ini` as it was using unsafe code to do things that are easily done in safe code. That change was included in rust-ini v0.21.2.

With the existence of unsafe code in the dependency tree and the possibility of bugs in that code and in the Rust standard library and compiler itself, I don't think I can claim that libloot is definitely memory-safe, but it's certainly safer than before. The changes I've made to avoid data races are an example of that: I could have done the same in C++, of course, but it didn't *seem* to be causing any issues the way it was. While I think LOOT's existing usage is fine, I might be wrong, and libloot is used by more than just LOOT, so on the whole I think it's a good thing that the Rust compiler forced me to add some guard rails.

That said, was the lack of memory safety a real problem for libloot? I had a look through libloot’s changelog and spotted about 10 fixed memory safety bugs. Anecdotally, there have definitely been many more that never made it to release, and I wouldn't be surprised if libloot v0.27.0 has some lying undiscovered. It's also plausible that the increased peace of mind is a more significant improvement than the actual bugs avoided in libloot.

## Documentation

libloot's public C++ API is documented using [Doxygen](https://www.doxygen.nl/) C++ source code comments. I'm not a fan of the HTML documentation that Doxygen produces though: I find it ugly and difficult to navigate, and although I've seen that it is possible to produce good documentation using it, it seems like a lot of work.

I prefer to build my docs using [Sphinx](https://www.sphinx-doc.org/en/master/) instead, with most content written in reStructuredText, and I use [Breathe](https://github.com/breathe-doc/breathe) to allow Sphinx to include the API reference docs that are extracted from the C++ source code by Doxygen, combining it with other pages of long-form documentation.

This other documentation is not specific to the C++ API, and so I wanted it to be usable by people only interested in libloot's public Rust API. Such users don't necessarily have Doxygen installed, so to prevent the Sphinx docs build failing in that case, I changed the Sphinx `conf.py` script to only activate the Breathe extension and run Doxygen if it was found in the user's `PATH`, and to otherwise exclude the C++ API reference page from the built docs.


Like the C++ API, the Rust API is documented using source code comments. They are extracted by [rustdoc](https://doc.rust-lang.org/rustdoc/index.html) to produce reference documentation, as is standard for Rust projects (it's what you get when you run `cargo doc`).

[Sphinxcontrib-rust](https://munir0b0t.gitlab.io/sphinxcontrib-rust/) provides an equivalent to Breathe for integrating Rust reference documentation into Sphinx docs, but I found that it's not as flexible as Breathe and its limitations mean that its output isn't as useful as rustdoc's. As such, while there is Rust API reference page in the Sphinx docs, it just directs readers to generate the Rust reference docs using Cargo.

I'm no expert, but I think one of the problems is that Sphinxcontrib-rust has to do its own parsing because rustdoc only produces HTML output, unless you use the unstable `--output-format json` option (fully: `cargo +nightly rustdoc -- -Z unstable-options --output-format json`). If that ever gets stabilised then it might allow Sphinxcontrib-rust to match rustdoc's output.

It's not ideal to have the reference and long-form documentation split like this, but given how easy it is to generate the docs for a Rust library and how standardised Rust API reference docs are, I think it's a reasonable approach. The docs for future releases of libloot will also link to the [docs on docs.rs](https://docs.rs/libloot/latest/libloot/).

## Increased memory usage 😢

Everything covered so far has either been an improvement or a neutral change, but I'd to have to work pretty hard to show you that increased memory usage is a good thing, actually. It came as a unwelcome surprise to me, but the silver lining is that I was able to identify the cause of almost all the extra memory usage, and it was easily addressable.

I compared the Rust port's memory usage against libloot v0.26.0, built with MSVC 2022 17.13.5 and Rust 1.86.0, by benchmarking LOOT v0.25.2's startup with both, only changing the libloot calls to be single-threaded. The default game install was a Skyrim SE install with 1600 plugins and 23 archives, and [this masterlist](https://github.com/loot/skyrimse/blob/3d1a3c9454df13dd0e43e614d9e4ec44e06e2667/masterlist.yaml) and [this prelude](https://github.com/loot/prelude/blob/f660436465bccbb5353fe453984ce14dab871415/prelude.yaml) were loaded.

At the point at which LOOT had finished loading, with libloot v0.26.0 it used 71 MB of memory, and with the Rust libloot it used 136 MB.

Most of the extra memory usage is due to regexes:

- About 3 MB is used to hold regex caches populated when loading plugins. This is inflated by the caches being thread-local and plugin loading being done across 16 threads.
- About 10 MB is used to store the regex objects loaded from the masterlist.
- Another 48 MB of data is cached when the metadata regex objects are used to match plugin names.

Another ~ 5 MB is used independently of the regexes, and I can't tell why: it doesn't show up as heap memory, and as far as I can tell data structure stack sizes should be smaller. I suspect the sampling just isn't picking up on the allocations responsible. This *really* bugs me, but I spent way too long trying to find an explanation, and I've got to let it go... I keep telling myself that 5 MB isn't the end of the world.

I did make a few changes to reduce memory usage:

- I found that rewriting the plugin metadata name regexes to use non-capturing groups instead of capturing groups reduced memory usage by ~ 7.3 MB after loading metadata and a further ~ 15.5 MB after matching metadata. This was surprising, as I'd have expected the regex engine to treat capturing groups as non-capturing groups if I'm calling a function that just gives a boolean match result, but there must be some complexity I'm missing (aside from the whole "how regexes work", of course).
- MSVC's implementation of C++ `std::string` has a small-string optimisation that can store up to 15 bytes on the stack, while Rust's `String` always stores its data on the heap. I did experiment with using the [smol_str](https://crates.io/crates/smol_str) library to do the same (it can store up to 23 bytes on the stack) in Rust for metadata strings (of which there are many), but it ended up being more efficient to use `Box<str>` instead (which allocates on the heap, but saves space by not having a capacity field, which makes it 8 bytes smaller in the stack on x86-64). I also replaced many instances of `Vec<T>` with `Box<[T]>`. This ended up reducing memory usage by about 4 MB.
- Calling `Vec::shrink_to_fit()` on the fields of `PluginMetadata` and on `Vec<MessageContent>` fields saved about 2.7 MB of heap usage. The C++ code doesn't do this, and when I tried it there it only saved ~ 100 kB. I think this is because MSVC uses a growth factor of 1.5 for `std::vector` while Rust uses a growth factor of 2 for `Vec`, so MSVC uses less space by default. I did try calling `shrink_to_fit()` in more places, but the other calls didn't have a noticeable effect.

### Swapping the regex implementation

The vast majority of the extra memory used is due to regexes. Fortunately, it's relatively easy to swap out the regex implementation. The memory usage benchmark results above are with the `fancy-regex` crate. I also ran the benchmarks with the `regex`, `regress` and `pcre2` crates:

- `regex` saw similar memory usage to `fancy-regex`, and when I disabled its Unicode support memory usage dropped by ~ 10 MB.
- `regress` saw no extra memory used by regexes compared to C++, and replacing capturing groups didn't have a noticeable effect.
- `pcre2` (bindings to the PCRE2 C library) didn't use any extra memory vs. C++ after loading metadata, but it used ~ 116 MB more heap memory after matching metadata. Surprisingly, replacing the capturing groups actually increased memory usage by ~ 14 MB.

I also tried building the `re2`, `tre-regex`, `hyperscan` and `yara` crates but they're all bindings to C/C++ libraries that wouldn't build on Windows (`yara` might have, but expected me to have Clang installed).

Given that `regex` makes performance guarantees that `regress` doesn't, I tried running benchmarks to measure their performance in isolation. I used [this tool](https://github.com/rust-leipzig/regex-performance) to do so, though it didn't work on Windows by default so I [forked it](https://github.com/Ortham/regex-performance/tree/windows) to fix that, and also update `regex` to v1.11.1, `regress` to v0.10.4 and add `fancy-regex` v0.15.0. I also disabled all of the regex libraries that wouldn't build out-of-the-box on Windows:

```powershell
cmake -B build -DINCLUDE_HYPERSCAN=disabled -DINCLUDE_RE2=disabled `
    -DINCLUDE_TRE=disabled -DINCLUDE_YARA=disabled `
    -DINCLUDE_BOOST=disabled -DINCLUDE_CTRE=disabled `
    -DINCLUDE_PCRE2=disabled -DINCLUDE_ONIGURUMA=disabled

cmake --build build --config Release
.\build\src\Release\regex_perf.exe
```

The results when built with Rust v1.88.0 and Visual Studio 17.14.9 were:

| Regex                                    | cppstd / ms | regex / ms | fancy-regex / ms | regress / ms |
| ---------------------------------------- | ----------- | ---------- | ---------------- | ------------ |
| `Twain`                                  | 28.8        | 0.2        | 0.4              | 0.2          |
| `(?i)Twain`                              | - [^regex-compile-error] | 0.8    | 0.8     | 7 [^ignores-modifier] |
| `[a-z]shing`                             | 812.2       | 0.4        | 0.4              | 86.4         |
| `Huck[a-zA-Z]+\|Saw[a-zA-Z]+`            | 90.2        | 0.6        | 0.8              | 1.2          |
| `\b\w+nn\b`                              | 1698.6      | 0.4        | 17.8 [^fancy-regex-fewer-matches]        | 128.2        |
| `[a-q][^u-z]{13}x`                       | 1580        | 44.6       | 44.6             | 199.2        |
| `Tom\|Sawyer\|Huckleberry\|Finn`         | 162.8       | 0.8        | 0.6              | 6.8          |
| `(?i)Tom\|Sawyer\|Huckleberry\|Finn`     | -           | 1.8        | 1.8              | 81 [^ignores-modifier] |
| `.{0,2}(Tom\|Sawyer\|Huckleberry\|Finn)` | 6526.2      | 0.6        | 0.6              | 642          |
| `.{2,4}(Tom\|Sawyer\|Huckleberry\|Finn)` | 6429.6      | 0.8        | 0.8              | 652.4        |
| `Tom.{10,25}river\|river.{10,25}Tom`     | 615         | 1          | 1                | 7.6          |
| `[a-zA-Z]+ing`                           | 2899        | 5          | 6.4              | 197          |
| `\s[a-zA-Z]{0,12}ing\s`                  | 792.4       | 5.2        | 6.2              | 103.2        |
| `([A-Za-z]awyer\|[A-Za-z]inn)\s`         | 1648.4      | 0.6        | 0.6              | 151          |
| `["'][^"']{0,30}[?!\.]["']`              | 52.4        | 3.6        | 4                | 8.2          |
| `?\|?`                                   | -           | -          | -                | -            |
| `\p{Sm}`                                 | -           | 18.4       | 18.6             | 0.2 [^regress-zero-matches]     |
| `(.*?,){13}z`                            | 66323.2     | 0.2        | 0.2              | 2846.2       |

[^regex-compile-error]: indicates that the regex failed to compile.
[^ignores-modifier]: regress does not support modifiers within regexes.
[^fancy-regex-fewer-matches]: `fancy-regex` found 1 match, the others found 262 matches. I'm not sure why that is. I did also find that `fancy-regex` v0.14.0 seemed to get stuck processing this regex.
[^regress-zero-matches]: `regress` found 0 matches as it does not support some Unicode property escapes, but `regex` and `fancy-regex` found 69 matches.

All of the Rust regex libraries are far faster than C++ `std::regex`. `regex` and `fancy-regex` are very similar as expected, while `regress` is often an order of magnitude (or more) slower.

In my real-world benchmarks of measuring LOOT [f99350d](https://github.com/loot/loot/tree/f99350d636c9584f01c7bb1723aa3b7155b18cbd)'s startup time I found that it was ~ 150 ms faster to start with a large load order, the Skyrim SE masterlist and prelude and libloot [ac0a355](https://github.com/loot/libloot/tree/ac0a355117940fedd4fbdf0ca3726f48cc3ce6bd) than it was with libloot v0.27.0, but there was no significant difference in performance between using `fancy-regex` or `regress`.

I'd previously picked `fancy-regex` over `regress` because I'd guessed that the former may have some potential advantages, but since these measurement results show that `regress` has the definite advantage of giving similar real-world performance to `fancy-regex` with less memory usage, I switched libloot over to `regress`.

## Risks

While I don't think the Rust rewrite is outright worse than the C++ implementation in any way (that unexplained 4 MB more memory usage is the closest it gets), it's not without new risks.

### New bugs

Rewrites are generally not a good idea: you may introduce bugs that weren't there before, and there are often alternative solutions to whatever problems the rewrite is trying to solve.

I certainly introduced many bugs in my rewrite, despite having written the original code myself and having both open side-by-side. You can see most of the fixes in [this compare view](https://github.com/loot/libloot/compare/051372318db13b551380a35ae346ea59b9c7cef7...597ae75c3c00ac5a23ea8167917c65cb4bcd2b9e), though there were [a](https://github.com/loot/libloot/commit/b90e73c3fbf78c290e9293f13891de5d1949870f) [few](https://github.com/loot/libloot/commit/415242b299cfcb3c2824da5ee525dd08ac4e8f30) [other](https://github.com/loot/libloot/commit/e8bc6a4805742f2c8067ef66e3abfebb2699e4b1) [issues](https://github.com/loot/libloot/commit/2ce3a6db3adbad9c02cdd9cd7e93bcf62ce87e68) that I only caught later. The typos are understandable, but there were also some real "WTF was I thinking?!" bugs...

Even with all of the tests ported, more tests added and code coverage measurements to hand, there may still be new bugs lurking.

### Error handling

Rust's error handling means that errors are either passed to the caller in the return type or cause a panic, which is similar to a C++ exception in some ways. However, while it is possible to catch unwinding panics:

- Rust code can be compiled to abort on panic instead of unwind
- while a panic can have a typed payload, panics themselves cannot be differentiated by type like C++ exceptions can
- a panic's payload cannot be accessed by the function that caught the panic, only by a global panic hook.

Whether panicking is the right approach is debatable, as while it's generally meant to be used only for unrecoverable errors, whether an error is unrecoverable or not depends on the role of the panicking code within the wider application. The classic example is a web application server that panics while handling a request: it's common to want to avoid that impacting other requests that are being handled concurrently.

I've done what I can to avoid panicking in the Rust port: I've configured the relevant linting rules to cause compile errors and code coverage is reasonably high, but unfortunately there isn't tooling to identify all panic sites, so the risk remains.

On the plus side, I did also go through the esplugin, libloadorder and loot-condition-interpreter dependencies and apply the same linting rules, so they've also benefited.

### Dependencies

Dependencies are great, because they save you from having to reinvent the wheel badly or copy code around. Dependencies are terrible, because if it's a first-party dependency then it's more work to version and release the code, and if it's a third-party dependency then you're reliant on someone else to maintain a codebase that is larger than what you'd have written yourself, and you've really got very little reason to trust that person to act in your interests (and they have very little reason to do so).

With libloot, I have a couple of dependency-related risks in mind:

- Supply chain attacks
- Dependency maintenance churn (i.e. the effort required to keep dependencies up to date, and any impact updates might have on libloot consumers)

These risks scale with the number of dependencies present.

The C++ codebase has seven direct third-party dependencies, and they are all well-known: Boost, ICU, TBB, fmt, spdlog, yaml-cpp and Google Test. They have no non-vendored dependencies. The C++ codebase also has three direct first-party dependencies, which are the Rust libraries previously mentioned. Those do have non-vendored dependencies of their own.

Excluding those first-party dependencies and their dependency trees (since they represent an already-accepted level of risk):

- The core Rust libloot library has 6 direct dependencies and a further 13 indirect dependencies (some are related)
- The C++ wrapper adds 3 direct dependencies (2 are related) and another 13 indirect dependencies.

#### Supply chain attacks

When it comes to finding out about known supply-chain attacks and other security issues, [cargo-audit](https://crates.io/crates/cargo-audit) is a useful tool, though GitHub's own advisory system pulls from the same [RustSec Advisory Database](https://github.com/RustSec/advisory-db/), so it's not something I feel the need to run since my codebase is on GitHub.

Security advisories only help if the issue has been reported. Ideally you'd review a potential dependency before adding it, and before updating an existing dependency, but a code review might involve tens of thousands of lines of code, which is not a fun way to spend your free time. I'm aware of a couple of tools to help with this: [cargo-crev](https://crates.io/crates/cargo-crev) and [cargo-vet](https://crates.io/crates/cargo-vet). Both can help you identify what dependencies need reviewing, see what's changed in a dependency since it was last reviewed, and most importantly provide ways to reuse reviews that others have done. [lib.rs](https://lib.rs/) integrates with both to display audits in a tab on crates' pages.

Unfortunately cargo-crev fails to build for me on Windows due to an OpenSSL dependency that wants Perl to be installed, and prebuilt Windows binaries aren't available. cargo-vet does build, and provides prebuilt binaries.

Although I haven't made cargo-vet part of my workflow (yet?), I have been using Dependabot to keep my direct dependencies up to date, and it can provide a link to a diff view of the changes, though that [isn't always possible](https://lawngno.me/blog/2024/06/10/divine-provenance.html). I've been reviewing those diffs, and it's been manageable so far.

#### Dependency maintenance churn

I've taken care to ensure that libloot's public API only depends on the Rust standard library. That means dependency maintainance churn is only a problem for me as libloot's maintainer, not for anyone using libloot.

One of the things I look at when deciding whether to use a dependency is its popularity, which I use as a proxy for reliability. I.e. enough people have used and continue to use this library that it probably works well and has done so for a significant amount of time, so I can reasonably assume that'll continue to be the case.

[crates.io](https://crates.io/) offers three stats for measuring popularity: total downloads, recent (last 90 days) downloads, and number of dependent crates.

Of libloot's 13 direct third-party dependencies, 6 have over 100 million downloads, 10 million recent downloads and 100 dependents as of 2025-05-10. Only 3 have less than 30 million total downloads and/or less than 150 dependents: [delegate](https://crates.io/crates/delegate), [regress](https://crates.io/crates/regress) and [saphyr](https://crates.io/crates/saphyr). `delegate` is only used to reduce boilerplate in the C++ wrapper, so while it adds value it's also easy to remove if that ever becomes necessary.

As I've already covered, I chose `regress` over `fancy-regex` due to the former's lower memory usage, and it wouldn't be a problem to switch back if necessary. I'm not concerned about depending on `regress` though.

The only direct dependency that causes me any real concern is `saphyr`, which libloot uses to parse YAML. There are two families of notable Rust libraries that provide YAML parsers:

- the first starts with `serde_yaml`, which is the most popular (121m total downloads/23m recent downloads/3170 dependents) and is built on top of `unsafe-libyaml` (72m/19m/10), both by the same author. However, both are unmaintained and officially deprecated by the author. Being unmaintained isn't necessarily a blocker: if the library works, it works. However, it only supports YAML 1.1, while libloot's metadata is documented as using YAML 1.2. I'm not sure if the differences are significant to libloot, but if there's a choice then it's best to err on the side of caution.
    - `serde_yml` (1m/757k/156) is a fork of `serde_yaml`, but it has a few meta issues that are very concerning:
        - everything summarised [here](https://users.rust-lang.org/t/serde-yaml-deprecation-alternatives/108868/42)
        - the GitHub repo has its issue tracker disabled, and there's nothing in the repo about how issues should be reported
        - the docs for the latest release (v0.0.12) aren't available on docs.rs because they failed to build, and that's been the case for 9 months and counting
        - it uses `libyml` (1m/757k/1), a fork of `unsafe-libyaml` by the same author, which describes itself as "a safe and efficient interface" but almost exclusively consists of `unsafe` functions, which does not inspire confidence
    - `serde_yaml_ng` (267k/121k/35) is another fork of `serde_yaml` that still uses the unmaintained `unsafe-libyaml`
    - `serde_norway` (182k/96k/8) and `unsafe-libyaml-norway` (137k/96k/1) are also forks of `serde_yaml` and `unsafe-libyaml` respectively

- the second starts with `yaml-rust` (77m/6m/299), which is also unmaintained, though in this case the author just disappeared.
    - `yaml-rust2` (8m/5m/55) is the most popular fork of `yaml-rust`, and the maintainers say they'll only be performing basic maintenance on it. From reading around, the maintainers seem responsive and have made some significant improvements in the couple of years since creating the fork.
    - `saphyr` is a fork by the same maintainers as `yaml-rust2`, but with the intention of making more substantial changes.

Given all of that, `yaml-rust2` seems like the best option, but one of my requirements is to be able to give line and column numbers in errors encountered when parsing YAML that's valid YAML but not a valid YAML representation of a metadata data structure. While `yaml-rust2` does expose line and column numbers in its lower-level event-based parser, using that parser would involve a lot more work than just using `saphyr`'s higher-level parser, which already exposes the line and column numbers I need.

Using `saphyr` does mean that I'm dealing with more API churn than if I'd built on top of `yaml-rust2`, but so far the trade-off has been well worth it.

## So how is the Rust version better?

While I've covered several improvements that have been made to libloot over the course of the rewrite, I'd say that **the improvements that are visible to projects that currently call libloot are likely to be minor at best**. That's not surprising: I set out to implement a like-for-like, drop-in replacement, so significant differences in behaviour would be a failure. The only exception I can think of would be if performance significantly improved, but C++ and Rust are similar enough to make that unlikely.

I did notice opportunities for improvement over the course of the reimplementation, but ported many of them over to the C++ codebase to be included in the v0.26.x and v0.27.0 releases, and have held off on some others to make the v0.28.0 release as boring as possible.

One immediate and potentially significant benefit is that if you'd like to use libloot but were put off by needing to use C++ to do so, you've now also got the option of using Rust without having to write a Rust wrapper around libloot's C++ API. On that note, libloot v0.28.0 is [available on crates.io](https://crates.io/crates/libloot).

Rust isn't simple or easy to pick up, of course, but I think there's still a vast gulf between it and C++ when it comes to being developer-friendly. The developer experience is probably the most significant impact for me as libloot's maintainer, as I've enjoyed the overall experience of building and maintaining my Rust codebases more than I have my C++ codebases. I think it's remarkable that a systems programming language can be so pleasant to use that I find myself reaching for it in contexts where there's no reason that I couldn't use a garbage-collected language.

I could dive into why that is, but I've got to stop somewhere. At the top of this post I said that there wasn't really a compelling reason to rewrite libloot in Rust, but that was a lie. This *is* a hobby project: that I found it interesting and enjoyed doing it are enough!
