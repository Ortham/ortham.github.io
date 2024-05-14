---
title:  A Year of Rust
date:   2018-10-19
summary: Why I chose to learn Rust, the benefits that it's brought to my projects, and some of its weaknesses.
aliases:
  - /2018/10/19/a-year-of-rust.html
params:
  toc: true
---

In the spring of 2017, I decided to learn another programming language that I
could use as an alternative to C++. In the end, I picked Rust, and I am very,
very happy with that choice. This article is about why I made that choice,
how I've benefited from it, and the weaknesses I've found in Rust.

(It's been a year and a half, but according to my commit graphs it's roughly a
year if I ignore the gaps.)

## Why A New Language?

I've been writing C++ since 2009, and I've been getting increasingly frustrated
with it over the years - C++11 was a big step forward for the language, and
C++14 and C++17 have continued the enhancements, but they haven't resolved many
of my issues. To summarise my main gripes:

- It's hard to do things right. There are often many ways to do something, and
  it's not clear which is generally best. The simplest or most idiomatic (if
  there's any such thing with C++) approach often isn't the right choice, and
  very little gets deprecated, so there's a lot of cruft.
- The standard library generally doesn't know Unicode exists, so working with
  non-ASCII text is a pain. There's a lot of non-ASCII text in the world! It's
  2018, this should not be a problem!
- New features like `std::tuple` and `std::variant` are *really* awkward to use,
  probably because they can't break existing syntax.
- The lack of a standard build system and dependency management. CMake comes
  close as a build system, though it's messy to work with, and dependency
  management is still very manual.
- There's a lot of what I can only describe as wizardry involved. It's easy to
  start writing it, but there is a **lot** to know, even just to stop shooting
  yourself in the foot. I consider myself competent with it now, I think I
  mostly know what I'm doing, but I also strongly suspect that I have *no idea*,
  and that's an uncomfortable feeling I can't see ever going away.

There are also a bunch of features I miss from other languages, but I don't want
this to devolve into "C++ vs. &lt;language&gt;". I think the above are
frustrations I'd have even if I didn't know any other languages.

So, I was looking for an alternative *for my use cases*. That qualifier is
important: C++ is a huge, old language that is used for all sorts of things, and
no new language is going to be able to offer itself as a credible alternative in
all of them. I was looking for something:

- with good cross-platform support
- that allowed integration with other languages, e.g. calling from Python,
  without much difficulty.
- that compiled to an executable
- that was statically typed
- that didn't have the problems I've mentioned above
- that I could use to build libraries and possibly desktop applications that are
  easy for other people to install and run
- that was stable
- that people enjoyed using (opinions are subjective, but if there's a
  perception that people actively enjoy a language, it's probably worth a look)

This left me with Go and Rust. C# came close, but I wasn't sold on its
cross-platform support, though that seems to be rapidly improving. Swift also
looked very interesting, but was and still is way behind on cross-platform
support.

I experimented with Go, but came to the conclusion that it wasn't what I was
looking for. It's quick and easy to (cross-)compile, has good tooling aside from
dependency management, and it's got a standard library that's great for building
network services. That's not what I do in my spare time though, and I think the
language is very clunky, its dependency management was a train wreck, and the
`GOPATH` made integrating with other projects a pain. The latter two are much
less of a problem with Go 1.11's modules, but that didn't exist at the time.

Rust isn't an ideal fit either, a lot of its complexity arises from achieving
memory safety without a garbage collector, and it doesn't really matter for my
use cases if there's a garbage collector involved or not. In a sense, I end up
paying for something I'm not using, but I think that it has turned out to be
worth it anyway.

## Early Impressions of Rust

I set aside a weekend to get to grips with the basics of Rust, and ended up
nearly tearing my hair out in frustration. I worked through the first edition of
[The Rust Programming Language](https://doc.rust-lang.org/book/) book, and I
remember feeling overwhelmed at how many concepts and how much new terminology
it chucked at me. There was also a lot that looked familiar from my C++
experience, but called different things, and I had trouble seeing why. I
underestimated the difficulty of the task I'd set myself, and in the end it took
a few weekends before I felt like I was starting to understand Rust.

In hindsight, a lot of what I've learned has proved useful beyond Rust, and I
wouldn't have gained nearly as much from learning a language that wasn't as
different from those I already knew. Of course, I didn't know that at the time,
and I only really persevered because I could see tantalising hints of something
interesting through all the confusion.

Thankfully, the second edition of The Book is a lot better, and there are a lot
of other learning resources now. The [Rust
Playground](https://play.rust-lang.org/) is great for experimenting with the
language in your browser. I've found the [Rust
Cookbook](https://rust-lang-nursery.github.io/rust-cookbook/) and [Rust by
Example](https://doc.rust-lang.org/stable/rust-by-example/) useful for providing
examples of how to do common things in Rust, especially as I found it difficult
to write idiomatic Rust without covering a lot of the language first. There are
also several more domain-specific guides available, e.g. for FFI, embedded and
WebAssembly. There's a big list of resources
[here](https://github.com/ctjhoa/rust-learning), but I haven't used most of them.

People who learn Rust talk of "fighting the borrow checker", and I did my fair
bit, but the errors that the compiler throws at you are usually easy to
understand, and I rarely find myself fighting the borrow checker these days.
Occasionally it requires me to structure code in a
particular way when the way I'd written it should be fine, but most of that will
disappear when [non-lexical
lifetimes](https://rust-lang.github.io/rfcs/2094-nll.html) are stabilised.
Self-referential structures remain a pain to write, but they're always a pain to
write without a garbage collector: Rust just helps the pain happen at compile
time, and not when you're running in production. [Learning Rust With Entirely
Too Many Linked Lists](https://rust-unofficial.github.io/too-many-lists/) is a
great guide through the difficulty involved, but I think I was lucky that I
didn't unwittingly try starting with anything that goes against the grain so
much.

Once I was past the initial "why won't anything compile?!" stage, I realised
that although Rust's ownership and lifetime semantics are something you have to
learn, the Rust compiler actually reduces my cognitive load by having them as an
explicit language feature. When I'm writing C++, I need to run the borrow
checker in my head, but with Rust the compiler does that for me, I just need to
know how to fix the issues that it spots.

## The Six String Types

I'm increasingly impressed by Rust's design as I use more of the language. Once
you understand its goals, what the language is trying to be, most things make
perfect sense. There have been some mistakes (e.g. `std::error::Error`), and
they're recognised as such, but for the most part everything fits together
really well, and any clunkiness tends to exist to expose some underlying
complexity that another language might just gloss over. If not, that tends to
result in ergonomics [RFCs](https://rust-lang.github.io/rfcs/).

As an example of this, there are six string types in the standard library:
`str`, `String`, `OsStr`, `OsString`, `CStr` and `CString`. This tends to
confuse and alarm people when I introduce them to Rust, but there's method in
the madness. `String`, `OsString` and `CString` own the strings they represent,
and can be mutated. They're like `std::string` in C++. The other types are their
borrowed slice counterparts, they don't own the strings but let you read them.
They're like C++17's `std::string_view` (but way more usable). The distinction
is important as it means you can pass around strings or substrings to be read
safely without copying data: it all ties into Rust's ownership semantics.

That explains half the types, but what's the difference between `String`,
`OsString` and `CString`? In Rust, `String` (and `str`) are always encoded in
valid UTF-8, are stored as a pointer and a length, and can contain nul
characters. C strings can be in any encoding and are stored as a pointer to a
nul-terminated array, so separate types are needed when interoperating with C.
Finally, `OsString` represents strings that come from the operating system,
which can have any encoding. `CString` could be used for this instead, but
`OsString` provides easier interoperation with `String` as the string doesn't
need to be nul-terminated.

So, in summary:

| Type       | Owns data? | Encoding | Nul-terminated? | For |
|------------|------------|----------|-----------------|-----|
| `String`   | Yes        | UTF-8    | No              | General purpose |
| `str`      | No         | UTF-8    | No              | General purpose |
| `OsString` | Yes        | Any      | No              | Interacting with the operating system |
| `OsStr`    | No         | Any      | No              | Interacting with the operating system |
| `CString`  | Yes        | Any      | Yes             | Interoperation with C |
| `CStr`     | No         | Any      | Yes             | Interoperation with C |


Why not stick with C strings for everything? Well, nul termination has been
called [The Most Expensive One-byte
Mistake](https://queue.acm.org/detail.cfm?id=2010365). In short, it is:

- error prone: for example, you could accidentally stick a nul in the middle of
  a string, and you've just chopped off everything after it, never to be seen
  again. Or you could accidentally chop the nul off the end of a string, and
  read past the end of the string.
- expensive: any operation that needs to find out the length of a string needs
  to count how many characters are in the string until it finds the nul
  terminator. It takes 10 times longer to find out the length of a 10 character
  string than it does for a 1 character string.

There are also many advantages to specifying a Unicode representation as the
string encoding over just letting it be anything, not least the knowledge that
you can represent

> all the characters for all the writing systems of the world, modern and
> ancient ... technical symbols, punctuations, and many other characters used in
> writing text
>
> <cite>[Unicode FAQs - Basic Questions](https://www.unicode.org/faq/basic_q.html#2)</cite>

and that you don't have to hope, guess or check at what encoding is being used
when it comes to processing text. UTF-8 is particularly useful because it's
compatible with ASCII, which is significant due to the historic dominance and
continued use of the English alphabet in computing.

## Practical Benefits

I could write a lot about how much I like the language, but instead I'll try to
focus on what real, practical benefits writing in it has brought me. I've done
the inadvisable, and rewritten two of my libraries in Rust: libespm and
libloadorder. Rewriting in another language is rarely worth it, but in this case
it was mostly an excuse to learn and practice Rust, and I think it paid off.

### libespm / esplugin

[libespm](https://github.com/Ortham/libespm) is a C++ library, and Rust
can't expose a C++ API, so the Rust rewrite was done as a completely separate
library, [esplugin](https://github.com/Ortham/esplugin).

I decided to write the plugin parser using [nom](https://github.com/Geal/nom),
which was overkill as it's a fairly simple file format, but it was a
good excuse to try the library out. I also used a few other third-party crates
for memory-mapping files, converting text from Windows-1252 to UTF-8, handling
compression and more efficient case-insensitive string comparison. Nom was the
only one to give me trouble, because it makes heavy use of macros for brevity,
and they didn't have great docs (the docs are much better now).

I used [Criterion](https://github.com/japaric/criterion.rs) to write benchmarks.
Rust has built-in benchmarking, but it's unstable and I don't know if it'll ever
be stabilised. It doesn't really matter because Criterion is much better anyway.
I also used [cbindgen](https://github.com/eqrion/cbindgen) to generate C and C++
header files from my Rust FFI code, which is very useful.

The two main benefits I observed were:

- libespm had a couple of memory unsafety bugs that I couldn't track down, and
  which are impossible in (safe) Rust. Segfaults are an utter pain to debug, so
  I'm glad they're gone (though I think Rust segfaults on out-of-memory? I don't
  know of any other reasons, so that's good enough for me).
- libespm had a bunch of cases that I hadn't noticed where it wasn't converting
  string encodings. Discovering them was partially just because I was going
  through the code in detail as part of the rewrite, but Rust's handling of
  different string types and conversions from byte buffers made it more obvious.

Libespm is a simple library, so there wasn't much space for any other
improvements, but to demonstrate how the little things can matter, here's a
comparison between the C++ and Rust implementations of a function:

C++:

```cpp
uint32_t getRecordAndGroupCount() const {
      ptrdiff_t countOffset(4);
      if (gameId == GameId::MORROWIND)
        countOffset = 296;

      for (const auto& subrecord : headerRecord.getSubrecords()) {
        if (subrecord.getType() == "HEDR") {
          auto rawData = subrecord.getRawData();
          return *reinterpret_cast<uint32_t*>(rawData.first.get() + countOffset);
        }
      }
      return 0;
}
```

Rust:

```rust
pub fn record_and_group_count(&self) -> Option<u32> {
    let count_offset = match self.game_id {
        GameId::Morrowind => 296,
        _ => 4
    };

    self.data
        .header_record
        .subrecords()
        .iter()
        .find(|s| s.subrecord_type() == "HEDR")
        .map(|s| LittleEndian::read_u32(&s.data()[count_offset..count_offset + 4]))
}
```

This isn't doing a lot, but it's worth pointing out:

- I mutate `countOffset` in C++, but in Rust variables are immutable by default,
  so instead I use some very simple pattern matching to handle both cases.
- I use iterator chaining in Rust instead of a `for` loop because I think it's
  clearer about what I'm doing: finding the `HEDR` subrecord, then mapping its
  value.
- In the C++ code, `rawData` is a `std::pair<std::shared_ptr<char>, uint32_t>`,
  which represents a reference-counted pointer to a char array, and the array
  length (I can't remember why I didn't just use `std::vector<char>`, maybe to
  avoid copies?). In Rust, `s.data()` returns a reference to a `Vec<u8>`, which
  also contains a pointer and a length (and a capacity) but isn't
  reference-counted because Rust's ownership semantics means I don't need the
  overhead. The C++ code is not memory-safe, because there's no guarantee that
  the memory at `countOffset` past the `rawData` pointer is part of the array.
  It might contain my credit card PIN instead! On the other hand, if the
  `Vec<u8>` is smaller than `count_offset` or `count_offset + 4`, the Rust code
  will panic because I've violated an invariant.

  It's worth noting that **panics are not for error handling**! The clue is in
  the name. In Rust, errors that are possible should be handled by returning
  `Result<T, E>`. Panics are for handling errors that should be impossible, so
  if one does occur, the best you can do in general is end the process and start
  again. In that sense, my Rust code is doing the wrong thing, because I'm
  parsing plugin files that may be invalid, so I shouldn't just assume that the
  `HEDR` subrecord has a valid size.
- In the C++ code, I return `0` to represent the count data not being found.
  This is a mistake, and I'd be better off returning an `int64` and use `-1` to
  distinguish between that case and the value existing but being zero. With
  C++17 I'd use the `std::optional<T>` type. Rust's `Option<T>` has similar
  semantics, but is an enum with two variants: `Some(T)` and `None`. This way
  you have to acknowledge the case where no value was found, you can't just
  forget that possibility. Rust's `Option` is a lot nicer to work with than
  C++17's `std::optional<T>`, with chaining and mapping operations available
  on it. I'd also argue it's safer, as you can trivially hit the dreaded
  undefined behaviour by dereferencing a `std::optional<T>` that you thought
  contained a value but didn't. Most importantly, it's very pervasive, so you're
  far more likely to encounter and use it.
- Another potential problem the C++ code has is that it assumes that the
  platform interprets the `uint32_t` as little-endian, whereas the Rust code is
  explicit about how it's interpreting the bytes. This is very unlikely to be a
  problem in practice, but I've included it for completeness.

The problems with the C++ code aren't issues with the language per se, they're
mistakes I've made. Some might argue that I should just not make mistakes, but
that's a ridiculous position, because nobody can ensure that. The point
illustrated is that when I slip up, Rust encourages safety and correctness where
C++ does not. Rust is a language that recognises that to err is human, to protect
from out-of-bounds memory access is best left to machines.

### libloadorder

[libloadorder](https://github.com/Ortham/libloadorder) is a more complex
library that depends on libespm. It provides a C API and I was able to leave
that unchanged (though I did actually make a few improvements), so
the library was rewritten in-place. I found that there were significant
advantages to writing it in Rust.

The C++ implementation used caching to try to minimise the amount of filesystem
interaction that occurred, but correctly invalidating the cache was hard and
caching data for too long was a persistent source of bugs. With the Rust
rewrite, I didn't implement caching, and instead used Criterion benchmarks to
drive profiling and optimisations. While I don't have proper benchmarks for the
C++ code, looking at the log statement times for libloadorder calls in LOOT
suggests that the Rust code is faster than the C++ code was.

I found that Rust's clear move semantics and explicit clones were a big help in
identifying and avoiding unnecessary copying of data. C++11 introduced move
semantics, but they're often implicit and taking advantage of them tends to
involve reversing the common advice to pass objects by reference, but not always
(I can't say I really understand the rules). In contrast, anything you don't
pass by reference in Rust is moved by default, unless its type implements the
`Copy` trait. For example:

```rust
fn increment(number: i32) -> i32 {
    number + 1
}

fn main() {
    let number = 5;         // number's type is inferred to be i32 because it
                            // gets passed to increment below!
    increment(number);      // number is copied because i32 implements Copy.
    println!("{}", number); // number can still be accessed because the value
                            // was copied, not moved. Prints 5.
}
```

`Copy` is typically only implemented when it's safe and cheap to do a bitwise
copy. If you want to copy a more complex type, the type has to implement the
`Clone` trait, which provides the `clone()` method to call. For example:

```rust
fn transform(string: String) -> String {
    string.to_lowercase()
}

fn main() {
    let string = "EXAMPLE".into();  // Type inference again.
    transform(string);              // String does not implement Copy, so is
                                    // moved.
    println!("{}", string);         // Compile error! string was moved into
                                    // transform() so can't be used again.

    let s2 = "EXAMPLE".to_string(); // Type inference needs more help due to
                                    // the clone berow.
    transform(s2.clone());          // String implements Clone.
    println!("{}", s2);             // A copy of s2 was moved into transform(),
                                    // so this is fine. Prints EXAMPLE.
}
```

This makes potentially expensive data copying obvious. Libloadorder's Rust code
contains only two calls to `clone()`, everything else is moved or referenced. I
can't say how many times the C++ code performed non-trivial copies (which is
itself a problem), but it was definitely more than twice.

Some of the performance improvements made involved introducing concurrency using
[Rayon](https://github.com/rayon-rs/rayon)'s parallel iterators. Rayon is
brilliant, and to show why, here's an example of turning sequential iterators
into parallel iterators.

This is a function using normal standard library sequential iteration:

```rust
fn sum_of_squares(input: &[i32]) -> i32 {
    input.iter()
         .map(|&i| i * i)
         .sum()
}
```

Here is the same function, but using a thread pool to distribute the work across
all your logical processors:

```rust
use rayon::prelude::*;
fn sum_of_squares(input: &[i32]) -> i32 {
    input.par_iter()
         .map(|&i| i * i)
         .sum()
}
```

While this example is trivial, Rust's memory safety guarantees also extend to
concurrency, so data races are impossible no matter how complex the concurrency
gets. Anything that the compiler lets you use across threads is safe to use
across threads. No more reading documentation to look for "this function is not
thread safe". Note though that Rust [doesn't protect you from more general race
conditions](https://doc.rust-lang.org/nomicon/races.html#data-races-and-race-conditions).
Still, I think it's a big deal, I don't know of any other language that supports
multithreading and which does a better job of avoiding thread unsafety.
"[Fearless
concurrency](https://doc.rust-lang.org/book/second-edition/ch16-00-concurrency.html)"
is a silly phrase, but that doesn't stop it being absolutely spot on.

On another concurrency-related note, Rust has built-in support for unit and
integration testing, and tests run in parallel by default. This meant I had to
properly isolate my filesystem tests, which was made easy by
[tempfile](https://github.com/Stebalien/tempfile). I really, really appreciate
tests being parallel by default, as while it can make setting up some tests more
involved, it's otherwise so easy to accidentally or lazily write tests that
depend on one another, which I've found tends to hide bugs and make life
difficult in the long run. It's another example of Rust pushing you towards
doing things correctly by default.

Unlike libespm, C++ libloadorder had documentation. It was built using
[Sphinx](https://www.sphinx-doc.org/en/master/),
[Breathe](https://github.com/michaeljones/breathe) and
[Doxygen](https://www.stack.nl/~dimitri/doxygen/), from a mix of
reStructuredText files and header doc comments. In this case, switching to Rust
wasn't a straight improvement in terms of the output, as Rustdoc isn't as
powerful as Doxygen or Sphinx, but there's something to say for being able to
generate nice HTML docs just by running `cargo doc`, and having them
automatically [available
online](https://docs.rs/libloadorder-ffi/11.4.1/loadorder_ffi/) when you publish
your code to [crates.io](https://crates.io/). As a bonus, cbindgen is smart
enough to include function doc comments in the headers it generates.

One major advantage to Rustdoc is documentation tests. If you write a block of
example code in your documentation, `cargo test` will run it as a test, which is
great for ensuring that your examples don't become outdated and break.
`cargo test` will also run code in `examples/` as tests.

Again, using Rust hasn't given me anything that can't be done in C++, but it's
much easier to reach the same level of safety, performance and quality. I don't
know how many times libloadorder's code has been run, but it's been a part of
LOOT releases that have clocked up over a million downloads so far, and the
only issues found have been a few logic bugs.

### svg_to_ico

[svg_to_ico](https://github.com/Ortham/svg_to_ico) is a very small
library and CLI utility that converts SVG files to ICO files so they can be used
as icons for Windows executables. I wrote it because LOOT used Imagemagick to
do the same thing, but its AppVeyor CI builds would occasionally fail because
there is no stable URL to download Imagemagick from, and each Imagemagick
release could break the URL Appveyor used.

svg_to_ico does much less than Imagemagick, but it's good enough to render the
SVG for an icon file. It was also really easy to build, and in particular I'd
like to mention how great [clap](https://clap.rs/) is for building CLIs. It's
got extensive support for different types of command line parameters and is very
flexible, so you can easily build quite complex CLIs with it. svg_to_ico's CLI
is simple, but here's its implementation as an example:

```rust
fn main() {
    let default_ico_sizes = vec![16, 20, 24, 30, 32, 36, 40, 48, 60, 64, 72, 80, 96, 128, 256];

    let matches = App::new(env!("CARGO_PKG_NAME"))
        .version(env!("CARGO_PKG_VERSION"))
        .about(env!("CARGO_PKG_DESCRIPTION"))
        .author("Oliver Hamlet")
        .arg(
            Arg::with_name("svg_path")
                .short("i")
                .long("input")
                .value_name("FILE")
                .help("Path to the SVG file to convert")
                .takes_value(true)
                .required(true),
        ).arg(
            Arg::with_name("svg_dpi")
                .short("d")
                .long("dpi")
                .value_name("DPI")
                .help("DPI to use when interpreting the SVG file")
                .takes_value(true)
                .default_value("96.0"),
        ).arg(
            Arg::with_name("ico_path")
                .short("o")
                .long("output")
                .value_name("FILE")
                .help("Output path for the ICO file")
                .takes_value(true)
                .required(true),
        ).arg(
            Arg::with_name("ico_sizes")
                .short("s")
                .long("size")
                .value_name("SIZE")
                .multiple(true)
                .long_help(&format!(
                    "An image size (height in pixels) to include within the ICO \
                     file. If no sizes are specified, the following are used: {:?}.",
                    default_ico_sizes
                )).takes_value(true),
        ).get_matches();

    let svg_path = matches.value_of("svg_path").map(Path::new).unwrap();
    let svg_dpi = matches.value_of("svg_dpi").unwrap().parse::<f32>().unwrap();
    let ico_path = matches.value_of("ico_path").map(Path::new).unwrap();
    let ico_sizes: Vec<u16> = matches
        .values_of("ico_sizes")
        .map(|i| i.map(|v| v.parse::<u16>().unwrap()).collect())
        .unwrap_or(default_ico_sizes);
```

I could have simplified it even more by using
[StructOpt](https://github.com/TeXitoi/structopt), which provides a declarative
wrapper around clap. More generally, I think Rust has a pretty good ecosystem
for building command-line applications.

### Type Safety

As far as I'm aware, the definition of type safety is contested, but it's
uncontroversial to say that Rust is more type safe than C++, as it disallows
implicit conversions between types except in a very limited set of
circumstances. Here's an example converting between signed integers.

```rust
fn main() {
    let i: i32 = 5;
    let j: i8 = i;         // Compile error!
    let k: i8 = i as i8;

    let a: i8 = 5;
    let b: i32 = a;        // Compile error!
    let c: i32 = a.into();
}
```

It's obvious why the first compile error happens, as you can't necessarily fit an `i32`'s value into an `i8`. It would be safe for the second case to compile, but Rust's type
safety prevents you from doing that. Instead the `Into` trait is used to perform
an infallible type conversion.

This might be seem overly pedantic, but here's a real-life story about why it's
a good thing.

In LOOT I recently switched from `boost::filesystem` to C++17's
`std::filesystem`. This would have been little more than a search/replace,
except that the `boost::filesystem::path::path(std::string)` constructor
performs an encoding conversion to the platform's native encoding using the
global locale's encoding converter, and the
`std::filesystem::path::path(std::string)` constructor assumes the string is
already in the platform's native encoding. LOOT uses UTF-8 for all its
`std::string` values, which is not the native encoding on Windows, so I needed
to add explicit explicit encoding conversion, or I'd end up with nonsense paths
if they contained non-ASCII characters. This can be done using
`std::filesystem::u8path`, so all I needed to do was replace all my path
constructor calls with calls to `u8path`.

If only it were that simple. The trouble is that the `path::path(std::string)`
constructor is implicit, so looking for path constructors wasn't enough. The
implicit constructor meant that I could call a function that took a `path`
object but give it a `string`, and the path constructor would be implicitly
called with the passed string. This didn't just stop at regular functions,
either. The `/` operator overload, used for appending path components, was
affected too. I had to painstakingly go through every mention of the filesystem
library in my codebase and ensure that it called `u8path` on any strings
involved, and I had to add tests for those cases I found.

This would not have been a problem in Rust, and indeed I avoided it for libespm
and libloadorder, as both also used `boost::filesystem`.

## Rust on the Web

That's all for now about how Rust has benefited my projects, but I thought I'd
mention a couple of interesting ways that Rust can be part of the Web.

### Backend Web Services

Writing a web service was much nicer than it has any right to be for a language
that's aimed at writing kernels, and it'll only get better as improvements like
[async/await syntax](https://rust-lang.github.io/rfcs/2394-async_await.html) are
stabilised, and as the ecosystem grows and matures.

I initially wrote a web service on top of [Hyper](https://hyper.rs/) as part of
[Yore](https://github.com/Ortham/yore), but after [Actix
web](https://actix.rs/) got a lot of hype for being *really, really fast* ---
it's in the top 10 for most of the TechEmpower Web Framework Benchmarks, and #1
for the plaintext test --- I noticed that it also abstracted more detail away
from request handling, like asynchronicity and query parameter parsing. I think
the resulting code is quite concise and easy to follow. Here's a snippet for
handling GET and PUT requests to one resource:

```rust
#[derive(Deserialize, Serialize)]
struct InterpolateBody {
    interpolate: bool,
}

impl InterpolateBody {
    pub fn new(state: &GuiState) -> Self {
        Self {
            interpolate: state.interpolate(),
        }
    }
}

type SharedGuiState = Arc<RwLock<GuiState>>;
type RequestState = State<SharedGuiState>;

pub fn build_server_app(state: SharedGuiState) -> App<SharedGuiState> {
    App::with_state(state)
        .resource("/interpolate", |r| {
            r.get().with(get_interpolate);
            r.put().with(put_interpolate);
        })
}

fn get_interpolate(state: RequestState) -> Result<Json<InterpolateBody>, ServiceError> {
    let state = state.read()?;
    Ok(Json(InterpolateBody::new(&state)))
}

fn put_interpolate((body, state): (Json<InterpolateBody>, RequestState)) -> HttpResult {
    state.write()?.set_interpolate(body.interpolate);
    Ok(HttpResponse::new(StatusCode::OK))
}
```

I've omitted them for brevity, but `GuiState` is a struct with a boolean field,
and `ServiceError` is essentially just an enum that implements Actix web's
`ResponseError` trait, with a bunch of variants and a trivial `From<T>`
implementation for each.

Writing backend web services in Rust might be unexpectedly simple, but I don't
feel that I can call this a "practical benefit", as I think if you're going to
be practical about writing a web service, you're (for now?) probably better off
picking a language that's designed for it like Go, or which has a huge ecosystem
around it like Java. Still, I wouldn't dare to write a web service in C++, so
it's significant that Rust makes doing so seem almost reasonable.

### Rust in the Frontend

Backend web services are one thing, but I think Rust's biggest value proposition
to the web is in compiling to WebAssembly (WASM) so that it can be run in the
browser. Rust isn't alone in targeting WASM, but I think it's definitely got an
edge, providing quite high-level zero-cost abstractions on top of a very small
runtime, great tools like Cargo, and access to an ever-growing ecosystem of
libraries that support running in highly constrained environments such as WASM.

Unfortunately, I don't have personal experience with Rust and WebAssembly, but
there's a lot of activity around it, and I'm definitely curious. I'll probably
try it out for myself at some point soon.

## Weaknesses

No programming language solves all problems equally well, and Rust has its share
of weaknesses. Here are a few that I've encountered.

### Building Desktop Graphical User Interfaces

Rust isn't great for building desktop GUIs. The best option I could find was to
use GTK through [gtk-rs](https://gtk-rs.org/), but I wasn't able to get it to
build on Windows, though it looks like its support for Windows has improved
since I tried. I somehow missed the [Rust Qt Binding
Generator](https://phabricator.kde.org/source/rust-qt-binding-generator/), which
looks like an interesting alternative that I plan to try.

From what I've seen, GUI frameworks tend to be heavily tied to the language that
they're implemented in, and even if they have a C interface that Rust can use
through FFI, it can be difficult to wrap that in a safe Rust interface or
translate the interface to idiomatic Rust. Cross-platform GUI frameworks can
take many years of effort to become most people's idea of "production ready", so
I think it's unlikely we'll see one written in Rust for years. In fact, I
wouldn't be surprised if no Rust GUI framework ever takes off: Rust isn't
designed for application development, and GUIs tend to involve lots of cyclic
and self-referential structures, so implementing one in Rust may just be too
painful to be worth it.

### C Interoperation Is Not Necessarily Seamless

Most notably, Rust strings and C strings are not the same, so conversion is
necessary. Extra care is needed also to handle the possible unsafety of values
coming from C. This involves a bit of boilerplate, so it's not a huge issue,
it's just not quite as simple as interop between C and C++.

### No Stable Cross-Platform Code Coverage Tooling

No code coverage tool is available on the stable compiler. Like other utilities,
the available code coverage tools (of which I've tried
[cargo-cov](https://github.com/kennytm/cov) and
[tarpaulin](https://github.com/xd009642/tarpaulin)) require access to compiler
internals, which are unstable, so they only run on the nightly compiler. It's
really easy to switch between stable and nightly, but I don't like having to
rely on a by-definition unreliable toolchain for code coverage. Hopefully this
will change in the future, I think it just needs time.

### Missing Language Features

There are a plenty of things that the language doesn't do, some by design, and
others because nobody has done them yet, or because their designs haven't been
agreed on. I've already mentioned non-lexical lifetimes and async/await syntax,
here are a few other things I've run into:

- [Specialisation](https://rust-lang.github.io/rfcs/1210-impl-specialization.html)
  isn't yet stable, so you can't write a generic implementation of a trait then
  write a more specific implementation for a type that's covered by the generic
  implementation. I've been able to work around this without much effort, but it
  can be a bigger problem in some cases.
- The [Delegation](https://github.com/rust-lang/rfcs/pull/2393) RFC isn't yet
  accepted, so using newtypes to hide implementation details is quite verbose,
  though there are third-party macros available that help.
- If you have a struct that has separate accessors for two independent fields,
  you can't mutably borrow both fields through their accessors at the same time,
  because the borrow checker can't know the fields are independent without
  leaking potentially private implementation details.  This is sometimes called
  "partial borrows" or "borrow regions", and as far as I'm aware, is an area of
  active experimentation. There is a handy workaround for this, and that's to
  return both mutable references in a tuple through a single accessor.
- There's no support for default values in function parameters.

### Compile Times

They aren't great, Rust compile times seem roughly on par with C++. As I
understand it though, this isn't due to any kind of fundamental limitation, and
there's plenty of room for improvement.

## Wrapping It Up

Overall I'm extremely happy with Rust, it's easy to see why it's the "Most
Loved" language in Stack Overflow's survey for the third year in a row. While
Rust's headline feature is its borrow checker and the memory safety that
affords, I think that's only one small part of what makes it such a pleasant
language to use. Hopefully I've shown some of the other parts above, but there's
still a lot more. I didn't really talk about its enums, slices or error
handling, or how wonderful the community is.

To temper that praise, the further you get from systems programming, the more
you pay for what you don't use. I think that the reason it's been adopted in
other domains is more about how much it brings to the table than how suitable it
is for those domains. Programming languages are tools, and it helps to pick the
right tool for the job.

Saying that, I want to try build a GUI using the Qt Binding Generator just to
see if it's any easier, and want to play around with WebAssembly. I'm also in
the process of rewriting part of LOOT's backend in Rust, and it's going well, so
maybe I'll have another article about that soon. That's it for now though, this
has gone on long enough!
