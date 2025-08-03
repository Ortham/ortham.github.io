---
title: Wrapping Rust for C++, Python and Node.js
date: 2025-08-03
summary: No prizes for guessing which is the most complicated.
---

My [last post]({{< ref "2025-04-24-porting-libloot-to-rust" >}}) described my experience of porting [libloot](https://github.com/loot/libloot) from C++ to Rust, but my goal was to have a drop-in replacement to the C++ implementation of libloot, and that requires a wrapper library that converts the Rust library's public API to the existing C++ library's public API.

This post covers the experience of writing that wrapper, plus wrappers for calling libloot from Python and Node.js. Those latter two wrappers are still experimental, and I chose Python and Node.js because:

- libloot has a Python [wrapper](https://github.com/loot/libloot-python), but it's been practically unmaintained since 2019 and only exposes a small part of libloot's API. Still, I thought it would be interesting to compare the experience of writing that wrapper with this one.
- I've never wrapped native code for Node.js before, and was curious how it would compare to the Python wrapper, and how calling the wrapper would compare to calling native JavaScript.
- Python and Node.js are my next-most-used languages (outside of my day job), so the experience might come in handy one day.

## The C++ wrapper

I could create FFI types and functions that use the C calling convention and that wrap the idiomatic Rust interface, generate headers for the FFI using [cbindgen](github.com/mozilla/cbindgen) and then call those FFI functions from C++. That's what I've done before to make libloot's Rust dependencies ([esplugin](https://github.com/Ortham/esplugin), [libloadorder](https://github.com/Ortham/libloadorder) and [loot-condition-interpreter](https://github.com/loot/loot-condition-interpreter)) callable from C++.

However, in the time since I wrote those wrappers, dtolnay created [CXX](https://cxx.rs/) to automate a lot of the fiddly details of going between Rust and C++, so I wanted to try using it to save myself some effort. I did briefly try out [Diplomat](https://github.com/rust-diplomat/diplomat), but can't remember why I didn't pick it, and I'd like to give it another go at some point.

The C++ wrapper is implemented in two layers:

1. The first layer uses CXX to produce a C++ library, and is built using Cargo. That C++ library has just about everything that's needed to use libloot's functionality (aside from some operators for the metadata classes), but the public API is quite different to libloot's existing C++ API, and it's a bit awkward to use due to heavy use of pointers to opaque types.
2. The second layer takes that C++ library and uses it to implement libloot's existing public C++ API, providing ABI compatibility with libloot v0.27.0. It's built using CMake.

  The second layer's tests are the same public API tests as from before the Rust rewrite (apart from a few very minor changes), which helped ensure consistent behaviour.

Although there are two layers using different languages and build tools, it's actually easier to build Rust libloot and its C++ wrapper than it is to build libloot v0.27.0. That's because the second wrapper layer has no third-party dependencies[^thin-wrapper], and CMake calls Cargo to build the first layer as a dependency of the second layer.

[^thin-wrapper]: Aside from the public API headers and tests the wrapper has only ~ 1600 lines of C++. The tests do have a couple of external dependencies (Google Test and a collection of test plugins that I maintain), but both are fully managed by CMake.

### Public C++ API improvements

As I went through the process of reimplementing everything in Rust and then writing the C++ wrapper, I noticed that there were several opportunities to improve the public API. That involved making breaking changes, so I released new versions of libloot with those changes to preserve my goal of the switch to Rust itself not breaking ABI compatibility.

Those API changes include:

- I added `SetLogLevel()` to the public API so that consumers had a way to stop log messages from being created and then thrown away because they were for higher than the consumer's verbosity level.
- I split `DatabaseInterface::LoadLists()` into `LoadMasterlist()`, `LoadMasterlistWithPrelude()` and `LoadUserlist()` as that means you can reload the userlist without having to reload the masterlist, and vice versa.
- The API functions now take `std::string_view` instead of `const std::string&` in function arguments wherever possible, after I noticed that converting from Rust structs to C++ classes involved a lot of double-copying strings.
- Where the API used to return plugin objects as `const PluginInterface*`, it now returns them as `std::shared_ptr<const PluginInterface>`. This avoids potential memory safety issues due to pointer invalidation (e.g. by clearing libloots' plugin cache and then dereferencing a pointer that you'd previously stored).
- I removed the public API's `fatal` log level, as it was never used, so there is no need for API consumers to handle it as a possibility.
- I removed the `ConditionalMetadata` class: while it makes sense, it's not useful, and does make the API that little bit larger and more complex.
- I removed the `FileAccessError` exception class because in practice it didn't add any value over just throwing a `std::runtime_error`.
- I removed the use of `std::system_error` with custom `std::error_category` values and error codes for some of libloot's internal dependencies because it leaked the use of those dependencies without providing any definitions for the error codes it exposed. Only one error code was actually useful to LOOT, so I mapped it to a new `PluginNotLoadedError` exception class that was also useful elsewhere, and replaced everything else with `std::runtime_error`.

None of these changes were strictly necessary for the Rust implementation or its wrapper to be possible, and only the addition of `SetLogLevel()` and replacement of `DatabaseInterface::LoadLists()` happened before I'd reached parity with libloot v0.25.4 (which was just shy of release when I started).

### The CXX layer

The first choice I had to make was where to put the code: in a module within the libloot crate, or as a separate crate that depends on it. That choice is complicated by CXX's distinction between opaque and shareable data types, and their requirements:

- Opaque types are types that are defined in one language but black boxes of unknown size to the other language, so the other language can only work with pointers to an opaque type, which adds a layer of indirection.

  Due to Rust's [orphan rule](https://doc.rust-lang.org/stable/reference/items/implementations.html#orphan-rules), opaque types must be defined within the same crate as the CXX bridge module, which is the module within which you declare what types and functions you want to share with C++ so that CXX can then make that happen during compilation.
- Shareable types can be passed by value in both languages, and shareable structs can have their fields accessed in both languages.

  CXX requires shareable types to be defined within the CXX bridge module, and they must be composed of other shareable types, which are primitives plus a few common types like `Vec` and `String`.

At first glance it seemed that putting the CXX code inside the libloot crate would make my life easier, but I ended up going with a separate wrapper crate for a few reasons:

- Of the types I wanted to expose to C++, only the enums could be exposed as shareable types. However, enums defined within the CXX bridge module aren't actually implemented as enums on the Rust side, because C++ allows invalid values to be set. That means that you need to handle the possibility of invalid values on the Rust side, and it's better to do that once in a conversion layer rather than to allow the possibility of invalid values throughout the Rust code.
- Limitations on what types are supported as function parameters or return types meant that there were only a couple of very simple types that I could expose as opaque types without having to write wrappers for their functions, and the cleanest way to write such wrappers is using the newtype idiom, which means I wouldn't need to have the original types defined in the same crate anyway.
- CXX uses a `build.rs` script to build the C++ side of its interface, and pulls in 13 additional dependencies. Keeping that separate from the core Rust APIs means that non-C++ consumers don't need to pay for what they're not going to use.

This led to a fairly large amount of boilerplate:

- Each libloot enum needed a copy defined inside the CXX bridge module, and functions to convert to and from the copy.
- Each libloot struct needed a newtype wrapper struct that implemented the struct's functions: the [delegate](https://crates.io/crates/delegate) crate helped with that, but often couldn't avoid the need to write out the wrapper functions when they needed to convert between types.
- Each wrapper struct needed functions to convert to and from the wrapped types.
- Each wrapper struct needed a creation function defined that could be called from C++ to produce a boxed struct (since the struct itself would be an opaque type).
- Each wrapper struct and its functions needed their type signatures added to the CXX bridge module.

All in all it comes to ~ 1,700 lines of Rust code, compared to ~ 15,000 lines in the libloot crate. That's not all boilerplate though, as I had to work around some standard types not being supported:

| Type | Workaround |
|------|------------|
| `Option<&str>` | `None` is represented by an empty string, which is already common in libloot's public C++ API.
| `Option<f32>` | `None` is represented by `NaN`, which libloot's public API already explicitly states indicates no value.
| `Option<&MessageContent>` | Implemented a shareable `struct OptionalMessageContentRef { pointer: *const MessageContent }`, which involved a little `unsafe` code. I generally use tuple structs for newtype wrappers, but CXX doesn't support sharing tuple structs.
| `Option<EdgeType>` | `EdgeType` is a shared enum, so I added a `None` variant to represent there being no edge.
| `Option<u32>`, `Option<Arc<Plugin>>`, `Option<PluginMetadata>` | The optional types didn't have "empty" or "invalid" values I could use to signal `None` semantics, so I implemented an `Optional<T>` wrapper as an opaque type, which means it has to be boxed.
| `Vec<&T>` | Cloned the values to get `Vec<T>`.
| `Arc<T>` | Wrapped in an opaque type, so the wrappers for `Database` and `Plugin` were actually wrappers around `Arc<RwLock<Database>>` and `Arc<Plugin>` respectively.
| `&Path` | Only appeared as an input parameter, so I took `&str` instead and it's a trivial conversion from that to `&Path`.
| `PathBuf` | For input parameters I took `String` instead and then trivially converted it. For return values the conversion to a `String` may cause an error to be returned instead.

The lack of support for the path types means that opaque path strings and other paths that can't be converted to UTF-8 can't be represented in the C++ API generated by CXX. However, the C++ implementation already assumes that paths can be encoded in UTF-8 in many places (e.g. when manipulating and logging paths), so this isn't a functional change, except that issues may be more obvious (the C++ standard says that when you ask for a UTF-8 encoding of a path that can't be UTF-8-encoded, the behaviour is [explicitly unspecified](https://eel.is/c++draft/fs.path.type.cvt)).

A few things caught me out but aren't CXX-specific and are obvious in hindsight:

- You can't use functions named `new` (which is a common Rust idiom for constructor-like functions) because that clashes with C++'s `new` operator.
- You can't use the `self` and `mut self` method receivers, because C++ lacks the ability to make methods consume the object they're called on.

A few other CXX limitations that tripped me up were:

- It's not possible to expose constants except as unmangled C FFI statics, which doesn't work for more complex types (like `&str`). As such, I exposed `LIBLOOT_VERSION_MAJOR`, `LIBLOOT_VERSION_MINOR` and `LIBLOOT_VERSION_PATCH` using `#[unsafe(no_mangle)] static` and `Group::DEFAULT_NAME` and `MetadataContent::DEFAULT_LANGUAGE` using functions that return their `&'static str` values.
- While `Result<T, E>` errors get turned into exceptions, there's only a single exception type that just uses the error's `Display` trait impl's output, which means source and error type data gets lost. I worked around this by mapping all of the Rust libloot errors to a new error type that built its `Display` output by recursively concatenating source error `Display` output to the error's own message, to produce a message that looks like `top-level message: mid-level message: root cause message`.
- While CXX [supports](https://cxx.rs/shared.html#derives) applying a set of standard trait derives to the Rust and C++ code of shared types, including comparison operators, that isn't supported for opaque types. Fortunately you can still expose trait methods (e.g. `eq`, `lt`, etc.) through CXX and call them instead of using the operators, but it's more boilerplate and less idiomatic, and only works for methods that return shareable type values.
- Since opaque types are only accessed through pointers, I added `boxed_clone(&self) -> Box<Self>` methods so that they can be copied in C++ code. There is [an issue](https://github.com/dtolnay/cxx/issues/105) for adding a `clone()` method to `rust::Box()` that has the same effect, but it's not seen any activity in a few years.
- If the Rust code panics, CXX calls `std::process::abort()`, and while CXX's author has [said](https://github.com/dtolnay/cxx/issues/1184#issuecomment-1445415100) that he's open to turning them into C++ exceptions, that is [blocked](https://github.com/dtolnay/cxx/pull/1180#issuecomment-1481326602) on a prerequisite PR that's gone unreviewed for over two years. That means calling Rust code is riskier than it really ought to be, as applications calling libloot through C++ cannot avoid crashing if libloot panics for any reason!

One trick that I implemented was to make the wrapper types transparent so that their ABI is identical to the types that they wrap, which means that if I have a reference to a type that needs to be mapped, I can just reinterpret the pointer, and vice versa. The same trick is also useful when you've got a slice of unwrapped types and need a slice of wrapped types. Without that, you'd need to create a new wrapper object and then you wouldn't be able to return a reference to it, because it wouldn't outlive the function it was created in.

That trick isn't needed when going from a `Vec` of wrapped objects to a `Vec` of unwrapped objects or vice versa: in that case you can simply write `vec.into_iter().map(Into::into).collect()` and because the wrapper is transparent the compiler is smart enough to optimise it all away.

### The ABI compatibility layer

This was mostly straightforward to write. I copied the public headers and their tests from libloot v0.27.0, wrote wrappers around the opaque types that implemented `GameInterface`, `DatabaseInterface` and `PluginInterface`, and functions to convert back-and-forth between the ABI-compatible metadata types and the types exposed by CXX. There were some rough edges though:

- You can't specify the underlying type that CXX will use on the C++ side for shared enums, so my ABI-compatibility layer had to yet again map the enums to the representations used in the existing C++ API.
- The logging callback in the C++ API is taken as a `std::function`, while in Rust it's `impl Fn(LogLevel, &str) + Send + Sync + 'static`, so the CXX layer exposes a function that looks like:

    ```rust
    #[unsafe(no_mangle)]
    pub static LIBLOOT_LOG_LEVEL_TRACE: c_uchar = 0;

    #[unsafe(no_mangle)]
    pub static LIBLOOT_LOG_LEVEL_DEBUG: c_uchar = 1;

    #[unsafe(no_mangle)]
    pub static LIBLOOT_LOG_LEVEL_INFO: c_uchar = 2;

    #[unsafe(no_mangle)]
    pub static LIBLOOT_LOG_LEVEL_WARNING: c_uchar = 3;

    #[unsafe(no_mangle)]
    pub static LIBLOOT_LOG_LEVEL_ERROR: c_uchar = 4;

    #[unsafe(no_mangle)]
    unsafe extern "C" fn libloot_set_logging_callback(
        callback: unsafe extern "C" fn(u8, *const c_char, *mut c_void),
        context: *mut c_void,
    ) { /* body */ }
    ```

    and the ABI-compatibility layer uses it like so:

    ```c++
    typedef std::function<void(LogLevel, std::string_view)> Callback;

    static Callback STORED_CALLBACK;

    LogLevel convert(uint8_t level) {
      if (level == LIBLOOT_LOG_LEVEL_TRACE) {
        return LogLevel::trace;
      } else if (level == LIBLOOT_LOG_LEVEL_DEBUG) {
        return LogLevel::debug;
      } else if (level == LIBLOOT_LOG_LEVEL_INFO) {
        return LogLevel::info;
      } else if (level == LIBLOOT_LOG_LEVEL_WARNING) {
        return LogLevel::warning;
      } else if (level == LIBLOOT_LOG_LEVEL_ERROR) {
        return LogLevel::error;
      } else {
        return LogLevel::error;
      }
    }

    void logging_callback(uint8_t level, const char* message, void* context) {
        auto& callback = *static_cast<Callback*>(context);

        callback(convert(level), message);
    }

    LOOT_API void SetLoggingCallback(Callback callback) {
        STORED_CALLBACK = callback;
        libloot_set_logging_callback(logging_callback, &STORED_CALLBACK);
    }
    ```
- The implementation of `GameInterface` in the ABI-compatibility is a little awkward because it needs to return a `DatabaseInterface&`, so the C++ `Game` class ends up indirectly storing an extra pointer to the underlying Rust `Database` struct. I could change the API to return a `std::shared_ptr<DatabaseInterface>` instead, but I think the semantics make more sense when returning a reference, and that's worth the extra pointer.
- `LIBLOOT_VERSION_MAJOR`, `LIBLOOT_VERSION_MINOR` and `LIBLOOT_VERSION_PATCH` are defined as compile-time constants in the public C++ API headers, so their values cannot be sourced from the Rust implementation, and instead the two must be kept in sync. That wasn't really a problem though, as I already had a script to set the version numbers in a few places, so just needed to add updating `Cargo.toml` to that script.
- The libloot C++ API provides exception classes that sometimes carry data alongside their messages, so to support that I updated my CXX layer's error type's `Display` impl to encode the relevant type names and data in what becomes the C++ exception's message. On the C++ side I catch the exception, parse the message to extract the types and data, then use them to construct and throw the appropriate exception class. It is *very* hacky, but it works.

  Unfortunately, while someone has implemented the ability to use custom exception classes in CXX, their [issue](https://github.com/dtolnay/cxx/issues/1186) hasn't had any replies since it was opened a couple of years ago, and their work is built on top of [another PR of theirs](https://github.com/dtolnay/cxx/pull/1180) that is also stuck in limbo without any feedback from CXX's author.

My overall impression after writing the C++ wrapper was that while CXX does a lot to help reduce the complexity of providing a C++ interface to Rust code, there are notable weaknesses around error handling and interop between comparison traits and operators. It would be great if those could be resolved, but I can't really complain about not getting even more stuff for free.

Aside from that, I think that a lot of the rough edges are due to Rust and C++ being too similar in what they're trying to accomplish, while being just too different in how they achieve that: it's like they both care about the little details, but disagree on what those details should look like.

### Binary sizes, compile times and link-time optimisation

You'd think that broadening and deepening the dependency tree and introducing a couple of layers of wrapper library would play havoc with compile times, but I found that it was actually faster!

I measured the time it took to run `cmake --build build --parallel --config RelWithDebInfo` for libloot v0.27.0 and the rewrite, starting with an environment that's just had `cmake` run to generate its build files and is otherwise clean, and found:

| Build                                   | Clean build time / s |
|-----------------------------------------|----------------------|
| libloot v0.27.0                         | 67.4
| libloot v0.28.0 [^not-actually-v0.28.0] | 31.3

[^not-actually-v0.28.0]: As this section discusses improvements made prior to v0.28.0's release, the I re-ran the benchmarks against a copy of the v0.28.0 code that had those improvements initially reverted, so that their impact as shown here is independent of other changes that were interspersed with the optimisations during development.

The v0.28.0 build spent 18.5 of its 31.3 seconds building the first (CXX) layer of the C++ wrapper and all its dependencies, with the rest of the time spent building the wrapper's second layer and its tests.

One obvious reason why the v0.28.0 build would be faster is that the v0.27.0 build has 3 Rust dependencies that are built independently, so effort is duplicated re-building dependencies that they happen to share[^repeated-dependency-builds], while the v0.28.0 build builds these shared dependencies only once. However, my stopwatch[^stopwatch] said that 29 seconds was spent building libloot v0.27.0's dependencies, which means more time was spent just building its own code than it took to build libloot v0.28.0 and its whole dependency tree. That didn't seem right, so I did a little investigation.

[^repeated-dependency-builds]: For example, libloot depends on esplugin, libloadorder and loot-condition-interpreter directly, but libloadorder and loot-condition-interpreter themselves depend on esplugin, so it gets built three times as part of the libloot v0.27.0 build process.

[^stopwatch]: I didn't have an easy way to get better wall clock timings for those parts of the overall CMake build.

Task Manager showed that the builds didn't make great use of my CPU's logical cores: when not building the Rust code, two were at 100% utilisation, while the other 14 were doing very little. I'd naively assumed that passing `--parallel` to CMake would set MSVC's multi-processor compilation option (`/MP`), but of course it doesn't, because that would be too obvious for CMake[^mp]. Explicitly passing `--parallel 16` instead had no effect, and neither did setting `$env:CMAKE_BUILD_PARALLEL_LEVEL = 16`. In the end I used CMake's `target_compile_options()` to apply `/MP` when building libloot and its C++ dependencies. That had a significant impact for both v0.27.0 and v0.28.0:

[^mp]: Kitware aren't alone in this: why does Visual Studio not default to multi-processor compilation? It's 2025, we've had consumer CPUs with 32 logical processors for half a decade!

| Build           | Clean build time / s | Clean build time with `/MP` / s |
|-----------------|----------------------|---------------------------------|
| libloot v0.27.0 | 67.4                 | 38.5
| libloot v0.28.0 | 31.3                 | 26.7

Sure enough, with that change I can see much greater use of all of my CPU cores in Task Manager. I'm not sure if the remaining extra 10 seconds are all due to the duplicated effort in building common Rust dependencies, but it seems plausible. I wonder how much time has been collectively wasted by `/MP` not being the default, and `--parallel` not setting it...

While binary size isn't a significant concern for libloot (it supports games that have vanilla install sizes ranging from 1 GB to 135 GB), I noticed that there was a ~ 600 KB difference in v0.27.0's favour, and decided to see if I could tweak link-time optimisation (LTO) settings to do anything about that.

Starting with `RelWithDebInfo` builds (and `debug="limited"` in Cargo, which is equivalent):

| Cargo `lto` config | MSVC config | v0.27.0 DLL size / KB | v0.28.0 DLL size / KB |
| ------------------ | ----------- | --------------------- | --------------------- |
| false              |             | 8798                  | 9510                  |
| false              | /LTCG       | 6986                  | 7530                  |
| false              | /GL         | 7456                  | 7623                  |
| "thin"             |             | 8798                  | 8055                  |
| "thin"             | /LTCG       | 6986                  | 6369                  |
| "thin"             | /GL         | 7456                  | 6459                  |
| "thin"             | /GL,/Ob2    | 7501                  | 6469                  |
| "fat"              |             | 8798                  | 6494                  |
| "fat"              | /LTCG       | 6986                  | 5218                  |
| "fat"              | /GL         | 7456                  | 5309                  |

I'm using v0.27.0 and v0.28.0 DLLs to refer to the DLLs built from those release commits plus the necessary config changes. I passed the Cargo config as CLI parameters for v0.27.0's Rust dependencies.

`/GL` implies `/LTCG`, and I added `/Ob2` for one of the builds because that's an optimisation that `Release` builds apply that `RelWithDebInfo` builds don't (by default they use `/Ob1` instead).

While the use of thin or fat LTO makes the v0.28.0 DLLs smaller than the v0.27.0 DLLs when debug info is generated, that wasn't true for `Release` builds:

| Cargo `lto` config | MSVC config | v0.27.0 DLL size / KB | v0.28.0 DLL size / KB |
| ------------------ | ----------- | --------------------- | --------------------- |
| false              |             | 4219                  | 4934                  |
| false              | /LTCG       | 4219                  | 4934                  |
| false              | /GL         | 4181                  | 4931                  |
| "thin"             |             | 4219                  | 5031                  |
| "thin"             | /LTCG       | 4219                  | 5031                  |
| "thin"             | /GL         | 4181                  | 5029                  |
| "fat"              |             | 4219                  | 4634                  |
| "fat"              | /LTCG       | 4219                  | 4634                  |
| "fat"              | /GL         | 4181                  | 4631                  |

Fat LTO gave the smallest binaries, but also more than doubled the clean build time for the Rust code (tested using `/MP` and `/GL` for the MSVC config and a `RelWithDebInfo` build):

| Cargo `lto` config | Cargo build time / s | Total build time / s |
| ------------------ | -------------------- |----------------------|
| false              | 18.3                 | 26.8                 |
| "thin"             | 19.4                 | 27.9                 |
| "fat"              | 42.0                 | 50.4                 |

With the Rust code already built using thin LTO, and using `/MP` for the MSVC config:

| MSVC config | Total build time / s |
|-------------|----------------------|
| /MP         | 9.8                  |
| /MP /LTCG   | 9.7                  |
| /MP /GL     | 9.6                  |

Given those results, I went with `RelWithDebInfo` builds using thin LTO, `/MP` and `/GL`.

## The Python wrapper

I implemented the Python wrapper using [PyO3](https://pyo3.rs/), and the whole experience was very smooth compared to the C++ wrapper:

- The [tooling](https://github.com/PyO3/maturin) around PyO3 is very simple to use.
- The generated Python module feels idiomatic, with none of the awkward restrictions that the CXX layer of the C++ wrapper has.
- PyO3 has good support for all sorts of bells and whistles: magic methods (e.g. `__str__`, `__repr__`, `__eq__`, etc.), class methods, getters, setters, method arguments that can be one of several types, optional parameters, and more.
- Rust `Result<T, E>` errors get turned into Python exceptions, and you can define and use custom exception types.
- Rust panics are turned into Python exceptions, so a panic won't unavoidably crash the calling Python process.
- Though it's not part of PyO3 itself, [pyo3-log](https://crates.io/crates/pyo3-log) links Rust's `log` to Python's [logging](https://docs.python.org/3/library/logging.html) library through PyO3.
- The general approach of defining newtype wrappers was the same as for the C++ wrapper, but instead of a bridge module, PyO3 uses attributes to configure exposed types and functions, and a function is used to define the Python module. That meant types and functions still need to be registered in that definition, but methods didn't, and there was no duplication of function signatures.
- While it doesn't support passing in `&Path`, it does support `PathBuf`, so there's some extra copying but no loss of functionality.
- It also doesn't support passing in `&[T]`, so some extra cloning is required. That might not be strictly true as it is possible to tie stuff to the GIL lifetime and do other more complicated things, but I'm not bothered by it enough to dive into that.
- Similarly, most types of references can't be returned, so several wrapper functions clone their return types, but that's no worse than in libloot v0.27.0 or the second layer of the C++ wrapper.

Although the Python wrapper felt very easy to write compared to the C++ wrapper, there wasn't actually that much difference in size between them: they had 1364 and 1551 lines of Rust code respectively. The Python wrapper is more feature-rich though, with things like comparison operators, more flexible object creation functions, and `__repr__` implementations.

I've previously used [pybind11](https://github.com/pybind/pybind11) to wrap C++ code (including old versions of libloot), and one weakness of PyO3 compared to pybind11 is that the former doesn't currently support generating type hints, though there is [an issue](https://github.com/PyO3/pyo3/issues/2454) with much discussion about it.

The Python wrapper is described as experimental in its readme, but I'm not aware of any fundamental issues with it: it just needs tests. However, I don't see the point in writing those tests unless there's something that's interested in using it. Similarly, I don't intend to publish binaries or a PyPI package unless that would be useful.

## The Node.js wrapper

The Node.js wrapper uses [NAPI-RS](https://napi.rs/) to bind to Node.js's [N-API](https://nodejs.org/api/n-api.html) (which is also supported by Bun and Deno), as that seems to be the most popular and well-maintained Node.js binding library for Rust. I've been aware of [Neon](https://neon-rs.dev/) for longer, but don't have any experience with it.

The Node.js wrapper code looks very similar to the Python wrapper, though the developer experience isn't as polished. Most notably, the CLI tool that you use to generate the package template expects Yarn to be installed, but the getting started docs suggest that's not necessary, and Yarn doesn't seem to be necessary to build the wrapper once you've got the template generated. I am not the [first](https://github.com/napi-rs/napi-rs/issues/1385) [to](https://github.com/napi-rs/napi-rs/issues/1428) [notice](https://github.com/napi-rs/napi-rs/issues/1638) [this](https://github.com/napi-rs/napi-rs/issues/2121).

There is one thing that NAPI-RS handles more cleanly than CXX or PyO3: while it still needs to convert between the wrapper's exposed enums and libloot's enums, that conversion can be infallible, as attempting to pass a value in JavaScript that would not be valid in Rust causes an exception to be thrown.

Compared to the Python wrapper, the Node.js wrapper was more restricted in the types that it supported:

- The only `&T` that seems to be supported as a return type is `&str`, so other `&T` need to be cloned into `T`, and `&[T]` needs to be turned into `Vec<T>`.
- `Vec<&T>` also isn't supported as a return type, again except for `Vec<&str>`.
- Function arguments must be passed by reference, except for a set of predefined types and types that are exposed to JavaScript as `Object` values with only public fields and no methods. That means there's some extra cloning of function argument values.

  Surprisingly, the opposite is true for `&str`: it can't be passed as a function argument and instead strings need to be passed as `String`.

There is notably more package boilerplate for the Node.js module than the Python module:

- generating the Python module template creates a `.gitignore`, `Cargo.toml`, `pyproject.toml`, `.github/workflows/CI.yml` and `src/lib.rs`, and builds only create a wheel in `target/wheels/`.
- generating the Node.js module creates a `.cargo/config.toml`, `.gitignore`, `.npmignore`, `.yarnrc.yml`, `__test__index.spec.mjs`, `build.rs`, `index.d.ts`, `index.js`, `package.json`, `rustfmt.toml`, `yarn.lock`, `Cargo.toml`, `src/lib.rs`, a `README.md` and `package.json` for each target platform you select, and optionally a `.github/workflows/CI.yml` file. Builds regenerate the `index.d.ts` and `index.js` files and creates a `*.node` file in the same folder.

Like PyO3, NAPI-RS turns Rust panics into Node.js exceptions.

Like CXX:

- Enums are only supported if they only contain unit variants, i.e. only C-like enums are supported.
- `&Path` and `PathBuf` aren't supported in functions or return types, so I used `String` instead. Node.js does support representing non-Unicode paths using `Buffer`, but I don't think that's necessarily convertible to `PathBuf` as the encoding of a `Buffer`'s data is not necessarily one that can be converted to the platform-specific encoding used by `PathBuf`.
- NAPI-RS doesn't expose the ability to define the type that is thrown when Rust `Result` values are turned into exceptions: everything is thrown as a JS `Error`. Unfortunately that means that some data I'd rather provide in fields on `Error` subclasses has to be stringly-typed in the error message instead.

  This doesn't seem to be an inherent limitation of Node.js's N-API, as [`napi_throw`](https://nodejs.org/api/n-api.html#napi_throw) allows throwing an error using a value of an arbitrary type, but that functionality isn't exposed through NAPI-RS. There's an [open issue](https://github.com/napi-rs/napi-rs/issues/1981) about it with some discussion, but there hasn't been any response from any maintainers.

  Taking the C++ approach of encoding the types in the error messages and having a second wrapper layer to convert the exceptions to dedicated types is an option, but I don't think it's really acceptable given that it's all that second layer would do.

Node.js doesn't have a standard (de-facto or otherwise) logging facade, so like the C++ wrapper, the Node.js wrapper exposes a wrapper around `set_logging_callback()`.

### Equality and private fields

This is the definition of libloot's `Location` metadata type:

```rust
/// Represents a URL at which the parent plugin can be found.
#[derive(Clone, Debug, Default, Eq, PartialEq, Ord, PartialOrd, Hash)]
pub struct Location {
    url: Box<str>,
    name: Option<Box<str>>,
}
```

Here's the Node.js wrapper's newtype wrapper around it, which gets exposed to JavaScript:

```rust
#[napi]
// None of these derives appear in the JavaScript type.
#[derive(Clone, Debug, Default, Eq, PartialEq, Ord, PartialOrd, Hash)]
#[repr(transparent)]
pub struct Location(libloot::metadata::Location);
```

And here's how it can be used:

```shell
node
> loot = require('./index.js')
> l = new loot.Location('https://www.example.com', 'An example')
Location {}
> l.url
'https://www.example.com'
```

Wait, what was up with that `Location {}`?

```shell
> Object.keys(l)
[]
> Object.getOwnPropertyNames(l)
[]
> Object.getOwnPropertyNames(loot.Location.prototype)
[ 'name', 'url', 'constructor' ]
```

Huh, okay, I suppose that makes sense: the Rust objects' fields *are* private. How does that affect equality comparisons?

```shell
> l == l
true
> l === l
true
> Object.is(l, l)
true
> l2 = new loot.Location('https://www.example.com', 'An example')
Location {}
> l == l2
false
> l === l2
false
> Object.is(l, l2)
false
```

All as expected so far: `l` and `l2` reference different objects in memory, so they're not equal even though they hold equal data. That's normal for JavaScript objects, I know to use a deep equality check when I'm checking if two objects hold equal data:

```shell
> l3 = new loot.Location('https://www.example.com/other', 'Other example')
Location {}
> assert = require('assert')
> assert.deepStrictEqual(l, l3)
undefined
> _ = require('lodash')
> _.isEqual(l, l2)
true
> _.isEqual(l, l3)
true
```

Uh oh, I expected `assert.deepStrictEqual(l, l3)` to throw an exception, and `_.isEqual(l, l3)` to return `false`.

What other common functionality loops over object properties - how about serialising the object as JSON?

```shell
> JSON.stringify(l)
'{}'
```

Also not good. But wait, `JSON.stringify`'s replacer parameter can be an array of property names to include, and [MDN doesn't say](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter) that they need to be its *own* properties:


```shell
> JSON.stringify(l, ['url', 'name'])
'{"url":"https://www.example.com","name":"An example"}'
```

OK, so it's not ideal but I could implement a deep equality check on top of that, since the order of properties is fixed for these objects.

But wait, what about just calling `toString()` instead of serialising the object as JSON?

```shell
> l.toString()
'[object Object]'
```

OK, that's not a surprise, but can I implement `toString()` in Rust?

```rust
#[napi]
impl Location {
    #[napi]
    pub fn to_string(&self) -> String {
        format!("{:?}", self.0)
    }
}
```

```shell
> loot = require('./index.js')
> l = new loot.Location('https://www.example.com', 'An example')
Location {}
> l.toString()
'Location { url: "https://www.example.com", name: Some("An example") }'
```

Yes! `toString()` also affects ordering comparisons:

```shell
> l2 = new loot.Location('https://www.example.com/other', 'Other example')
Location {}
> l < l2
true
> l2 < l
false
```

Though because `l < l2` is effectively `l.toString() < l2.toString()` it might give different behaviour than if comparing `l < l2` in Rust.

This isn't just a weird quirk with exposing a native object to JS, the same thing happens with [private elements in classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_elements), which have been widely supported in browsers and Node.js for about 4 years:

```shell
> class Loc {
... #url;
... #name;
... constructor(url, name) { this.#url = url; this.#name = name; }
... get url() { return this.#url; }
... get name() { return this.#name; }
... }
> loc = new Loc("https://js.example.com", "private element")
Loc {}
> loc.name
'private element'
> loc.url
'https://js.example.com'
> loc2 = new Loc("https://js.example.com", "private element")
Loc {}
> loc3 = new Loc("https://js.example.com/other", "other private element")
Loc {}
> _ = require('lodash')
> _.isEqual(loc, loc2)
true
> _.isEqual(loc, loc3)
true
```

JavaScript is a [deeply](https://www.destroyallsoftware.com/talks/wat) [weird](https://wtfjs.com/) [language](https://jsdate.wtf/). We know this, but it's easy to forget the specifics, and TypeScript and linters are guardrails that help keep us from accidentally straying too close to the language's more bizarre "features", but every now and then you might still find yourself off the beaten path.

I'm not sure if there are any established patterns for dealing with objects that have private elements, but one workaround would be to provide methods like `.equals()`, `.compare()`, etc. to take the place of what would be done using operator overloading in other languages. It seems like that could be done by a macro that could generate such methods for types that already implement `Eq` and `Ord`.

### Next steps

The Node.js wrapper is currently experimental, and there are a few things I'd want to see before removing that label:

- like the Python wrapper, it needs tests
- it needs to support custom exception types and their use equivalent to those in the C++ wrapper
- the metadata classes (and `Vertex`) need methods equivalent to the comparison operators that they have for C++, Rust and Python
- it would be good if Yarn wasn't a requirement, because it's not clear why it is one, and it doesn't actually seem to be required past the initial setup

Again, like the Python wrapper, I don't currently intend to work on resolving any of these points.

## Closing thoughts

That the C++ wrapper took the most effort is hardly surprising, even without the extra complexity of maintaining ABI compatibility, but CXX made it a heck of a lot less effort than it would have otherwise been. Still though, I'd definitely rather not start a greenfield project that needs direct interop between C++ and Rust.

I'm surprised that the Node.js wrapper feels so rough, but I don't know how much of that is because of JavaScript and how much is due to NAPI-RS's current limitations. Trying out Neon might help me figure that out, but I'm not sure if or when I'll get around to it.

PyO3 does a great job of making it easy to call Rust code from Python: I can see myself reaching for it in the future if I find myself writing a Python script or application that needs more performance in certain places than Python can easily give, but don't want to rewrite the whole script in Rust (or dust off my Go and use that).
