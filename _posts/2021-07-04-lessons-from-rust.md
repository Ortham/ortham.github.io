---
title: Lessons from Rust
date: 2021-07-04
excerpt: Using constraints to write code that can only do what you want.
---

[Rust](https://www.rust-lang.org/) is a relatively young programming language (its 1.0 release was in 2015) that has made waves in large part due to its ability to promise memory safety without using a garbage collector (GC). This makes it of interest to developers working in domains that predominantly use C and C++, and other features like its thread safety and rich type system have helped it attract a wider audience.

I started to learn and use Rust in 2017 after looking for an alternative to C++ in my personal projects, and I've found that the C++ I've written since has improved as a result. This is not surprising, as the two languages are designed to solve similar types of problems (e.g. high performance, low overhead and predictable execution) and Rust takes some design inspiration from C++ (e.g. RAII).

What's perhaps more surprising is that I think it's also improved the code I write when using a GC'ed language, as it's introduced me to different ways of reasoning about code, reinforced some knowledge of best practice, and nudged me towards putting that knowledge into practice more often.

This article is an attempt to demonstrate some examples of how learning Rust has improved my GC'ed code. If you want, you can run the Rust code snippets by copy and pasting them into the [Rust Playground](https://play.rust-lang.org/).

## Compile-time immutability

Here's some problematic JavaScript:

```js
// Does this transform the item by mutating it, or does it take a deep copy and
// modify then return the copy? No way to tell from the function signature.
function transform(item) {
    // It isn't so helpful when the function mutates the item AND returns a new
    // object, and that's very easy to do accidentally.
    item.counter += 1;
    return { ...item };
}

// JS supports distinguishing between variables that can and can't be reassigned
// using let and const, but const doesn't prevent mutation of values in-place.
const item = { counter: 0 };
item.counter += 1;

console.log(item.counter);

const transformedItem = transform(item);

console.log(item.counter);
console.log(transformedItem.counter);
```

There are three problems here:

1. `const` doesn't prevent values from being mutated. If the variable's value is
   an object (which in JS includes arrays), then mutation of the object or one
   of its properties may happen in a way that is not obvious and which may cause
   problems.
2. The declaration of the `transform()` function says nothing about whether or
   not it mutates its parameter. In general to find out if a function mutates
   any of its parameters you need to read the implementation of it and all the
   functions it calls, and all they call, etc. In practice, this leads to
   either defensive copying before calling functions or hoping everything will
   work out fine. Neither is great.
3. The code may be correct when written, but there's nothing to stop mutation
   being introduced over time in a way that may not be obvious and which may
   break an invariant.

Variables and values in Rust are immutable by default, as this example demonstrates:

```rust
// Here we define a type that is a struct named Item that has a single field.
struct Item {
    // The field name is counter, the type is an unsigned 8-bit integer.
    counter: u8
}

// This function mutates the parameter, which is a mutable reference to an Item
// object.
fn transform_in_place(item: &mut Item) {
    // Here the item variable is not mutable, so I can't reassign it, but its
    // type is a mutable reference, so I can modify its value.
    item.counter += 1;
}

// This does not mutate the parameter, which is an immutable reference to an
// Item object. The function returns a new Item object.
fn transform_clone(item: &Item) -> Item {
    // Here we return a new item created from the input. Rust functions are
    // expressions, so the value of the last expression in the function is
    // what gets returned.
    Item { counter: item.counter + 1 }
}

// This mutates the parameter, which is an object, then returns the mutated
// objects. Due to move semantics, the compiler prevents the input variable from
// being used after this function is called, so the fact it is mutated doesn't
// introduce any ambiguity.
fn transform_move(mut item: Item) -> Item {
    // Here the item variable needs to be mutable to modify its value, because
    // the type is not a reference.
    item.counter += 1;
    item
}

// This function is equivalent to the JavaScript transform() function above, but
// with less ambiguity.
fn transform(item: &mut Item) -> Item {
    item.counter += 1;
    Item { counter: item.counter }
}

fn main() {
    // The mut keyword indicates this variable is mutable. If it wasn't mutable
    // I wouldn't be able to take mutable references to it, reassign it or
    // modify its value.
    let mut item = Item { counter: 0 };

    // println!() is a macro that prints a string to stdout and adds a line
    // break on the end. It supports variable substitution using {} brackets.
    println!("{}", item.counter);

    transform_in_place(&mut item);

    println!("{}", item.counter);

    let transformed_item = transform_move(item);
    // item can no longer be used because the value was moved.

    println!("{}", transformed_item.counter);

    let mut new_item = transform_clone(&transformed_item);

    println!("{}", transformed_item.counter);
    println!("{}", new_item.counter);

    let newest_item = transform(&mut new_item);
    println!("{}", new_item.counter);
    println!("{}", newest_item.counter);
}
```

Being able to forbid mutation of variables and values at compile time is useful because it:

* helps prevent accidental mutation that may lead to broken invariants
* makes code easier to read (because the number of things the code _could_ be doing is reduced)
* makes it easier to achieve thread safety.

C++ has similar support for immutability with its `const` keyword, so Rust's capabilities weren't new to me. The main difference is that immutability in C++ is opt-in, while in Rust it's opt-out. I find opt-out immutability to be far more useful, because it means that variables are in their simplest, most restricted state by default, and you need to explicitly opt into introducing more potential complexity. This helps to convey intent to anyone reading the code. It also means you're much less likely to miss a chance to use immutability, and so are more likely to benefit from it.

Rust's strictness around taking references (which we'll get to later) also means that you're actively encouraged to avoid using mutable variables unless necessary, and this has led me to better appreciate just how many variables in normal imperative code can be immutable, and also made me more aware of the issues that unrestricted mutability can allow.

However, that hasn't made me lock down mutability as much as possible when writing in other languages. There are a few reasons for that:

* language-level inertia: if I'm used to writing code a certain way it's difficult to change that habit
* conforming to existing code styles: if I'm working in an existing project (especially if I'm not alone) then conforming to the existing style is important and style changes should probably be managed as a separate piece of work (which will often go in the backlog and never get done...)
* ease of use: if a language supports immutability but it's verbose or difficult to use then I'm simply less likely to bother. This is partly laziness, but also recognition of the fact that while immutability can prevent some classes of issues, I've got limited effort to spend and spending it on implementing immutability just may not be worth it.
* code complexity and runtime performance: similar to ease of use, if immutability makes the code significantly more complex or slower then it may not be worth using.

Note that this is all about being able to forbid mutation of variables and values at compile time. Many languages allow you to define immutable data types, which is great when you can use them, but often you have some mutable data that you just want to prevent mutation on within a certain scope. Some languages support preventing mutation at runtime, but this gives none of the advantages I listed above and means you're relying on test coverage to catch mutation bugs and/or are shipping them to production. As such, I tend to view runtime immutability as an assertion enforcing an invariant and use it sparingly as a result.

## Ownership

If you're already familiar with Rust's ownership system, feel free to skip to the bottom of the code block below. Otherwise, here's a brief introduction to it before I talk about what's transferrable to languages that have a GC.

One of Rust's headline features is its novel approach to memory safety without garbage collection, which very few languages can claim. Rust achieves this by tracking data ownership and lifetimes and enforcing some rules about them at compile time. For ownership, these rules are (taken from [The Rust Programming Language](https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html)):

* Each value in Rust has a variable that’s called its owner.
* There can only be one owner at a time.
* When the owner goes out of scope, the value will be dropped (i.e. deallocated from memory).

If you want to access a value without changing its owner, you need to take a reference to it. The rules for references are:

* At any given time, you can have either one mutable reference or any number of immutable references.
* References must always be valid.

Here's some code demonstrating these rules:

```rust
// This derive attribute just means that we can debug-print the value of this
// struct using the "{:?}" syntax below.
#[derive(Debug)]
struct Example { counter: u8 }

fn main() {
    let owner = Example { counter: 0 };

    // This takes two immutable references to the value owned by owner.
    let borrower1 = &owner;
    let borrower2 = &owner;

    // These three all work because neither borrow moved the value from owner,
    // so all three variables have valid values.
    println!("{:?}", borrower1);
    println!("{:?}", borrower2);
    println!("{:?}", owner);

    // Uncommenting this causes a compile error because you can't take a mutable
    // reference to an immutable variable.
    // let mut_borrower = &mut owner;

    // This creates a new scope.
    {
        // This moves the Example struct instance from the owner variable to the
        // new_owner variable.
        let new_owner = owner;

        // Uncommenting this causes a compile error as owner can no longer be
        // used because it isn't bound to a valid value.
        // println!("{:?}", owner);

        println!("{:?}", new_owner);
    }

    // Uncommenting this causes a compile error as new_owner is no longer in
    // scope: the Example struct instance has been deallocated.
    // println!("{:?}", new_owner);

    let mut mut_owner = Example { counter: 1 };
    {
        let borrower = &mut_owner;

        // Uncommenting this causes a compile error because you can't take a
        // mutable reference while you've got any other reference to the same
        // data.
        // let mut_borrower = &mut mut_owner;

        println!("{:?}", borrower);
    }

    {
        // Here we take a mutable reference, which works because there are no
        // other references to the same data.
        let mut_borrower = &mut mut_owner;

        // We're able to mutate the object as expected.
        mut_borrower.counter = 2;

        println!("{:?}", mut_borrower);
        println!("{:?}", mut_owner);
    }
}
```

The point of Rust's rules around ownership and references is to prevent the programmer from writing code that could cause memory unsafety. This often leads to people learning Rust going through a period of "fighting the borrow checker", where the programmer hasn't yet internalised the rules and keeps trying to use patterns that draw the compiler's ire.

A garbage-collected language doesn't need these rules because its runtime is responsible for ensuring that all memory access is safe, so the programmer needs to do less work to appease the compiler (or interpreter). However, a GC is not a pancea, and while it means that you don't *have* to think about memory management, I find it helps to keep it in mind. The less time spent crawling around in heap dumps and snapshots because your program unexpectedly ate all available memory, the better: prevention is often better than cure.

I think that paying attention to how long variables have to live, scoping them accordingly and being careful with taking references often leads to code that is easier to understand, less buggy and more performant, even in GC'ed languages. I've tried to demonstrate some examples of this in the subsections below.

### Iterator invalidation

Iterator invalidation is probably the most obvious example of the problems that can arise from allowing concurrent writes or reads and writes even when only using a single thread, and it's not just a problem in C++ (where it's most famous). Here's some Java:

```java
var array = new ArrayList<Integer>();
array.add(1);

var iterator = array.iterator();
while (iterator.hasNext()) {
    iterator.next();

    // This causes a ConcurrentModificationException to be thrown.
    array.add(4);
}
```

Fortunately, iterator invalidation doesn't cause memory unsafety in Java: however, not all collections will throw a `ConcurrentModificationException` and those that may can't guarantee that they will, so you may see erratic behaviour instead.

I don't recall ever coming across iterator invalidation in JavaScript, but that doesn't mean shared mutability can't cause problems. Here's the equivalent to the Java code above:

```js
const array = [1];
const iterator = array.values();

let next = iterator.next();
/* This while loop causes the V8 JavaScript engine to crash with
   FATAL ERROR: invalid array length Allocation failed - JavaScript heap out of memory */
while (next.done !== true) {
    array.push(4);
    next = iterator.next();
}
```

While you wouldn't often use iterators directly in Java or JavaScript, they underpin the implementation of some types of loops, so the same problems can occur in more idiomatic code.

### Mutable globals

Mutable globals are widely acknowledged to be problematic for a variety of reasons, and Rust makes you handle them with care because they are another case where concurrent reads and writes can cause big problems. If you really need a mutable global, here's one way you can do it in Rust:

```rust
use std::cell::RefCell;
use std::thread;

// This macro abstracts away some platform-specific boilerplate.
thread_local! {
    // This variable is global within a thread. RefCell is essentially a
    // container that enforces Rust's reference rules at runtime instead of
    // compile time.
    static THREAD_STATE: RefCell<u32> = RefCell::new(1);
}

fn main() {
    // The "|...| { ... }" syntax is for a closure: the vertical bars delimit
    // the closure's parameters, and the curly braces delimit the closure's
    // body.
    THREAD_STATE.with(|counter| {
        // Here counter is a reference to the RefCell, which we then borrow
        // mutably from (which will panic if the value is currently borrowed,
        // enforcing the rule of unique mutable references) to get a reference
        // that we can dereference to change the value. RefCell provides
        // something called "interior mutability", which is why we can mutate
        // the value inside it even if we only have an immutable reference to
        // the RefCell itself. It's like using the "mutable" specifier in C++.

        // unwrap() can be used to avoid handling errors properly (it causes a
        // panic if an error occurs). Here we use it because we know that no
        // other references exist, so getting a mutable reference can't fail.
        let mut mutable_ref = counter.try_borrow_mut().unwrap();

        // Here we dereference the mutable reference wrapper type so that we can
        // assign a new value.
        *mutable_ref = 2;
    });

    // thread::spawn spawns a new thread that runs the given closure.
    let other_thread = thread::spawn(|| {
        // This closure gets run in a separate thread, so the state in the main
        // thread is unmodified.
        THREAD_STATE.with(|counter| {
            println!("other thread: {}", *counter.borrow());
        });
    });

    // join() means we wait for the thread to end execution before continuing.
    other_thread.join().unwrap();

    THREAD_STATE.with(|counter| {
        // This runs in the same thread as the mutation happened, so we see the
        // effect.
        println!("main: {}", *counter.try_borrow().unwrap());
    });
}
```

The code above only involves a thread-local mutable global, because a thread-safe equivalent is much more complicated to initialise, though there are libraries available that reduce the boilerplate. Even so, the 'extra' hoops you have to jump through when accessing a mutable global (read: stuff you should be doing anyway) means you're much less likely to use one in the first place and will therefore avoid all the associated problems.

In other languages mutable globals are often an easy way to implement things like in-memory caches, but that ease tends to be deceptive. I found that Rust forcing me to use mutable globals properly was a great way to highlight how much of a pain they can be, and reinforced how being sloppy with them can introduce bugs. That's not to say I don't still use them, but Rust has taught me to think again before reaching for them.

### Memory usage & leaks

As mentioned earlier, Rust's rules about lifetimes and references encourage you to write code that holds references for only as long as necessary. This predisposition towards short-lived references is also useful in a GC'ed language for a couple of reasons:

- While you don't have control over when memory will get freed, and while there are many different garbage collectors around, it's often true that shorter-lived references means the GC can manage memory more effectively, reducing overall memory usage and time spent performing GC---assuming that reducing reference lifetime doesn't involve performing significantly more allocations to compensate.
- Neither Rust's compiler nor a GC will save you from memory leaks, though Rust makes it difficult to leak memory unless using reference-counting smart pointers or explicitly opting into leakage (which is sometimes necessary or desireable). However, reducing reference lifetimes generally reduces the chance of leaking memory.

One thing I've found is that a good way to avoid difficulties with lifetimes is to adopt a more functional style of programming, which naturally involves less state hanging around. A perspective that I've found useful for doing this is to consider a program as a pipeline through which data flows and is transformed from input to output. However, without appropriate data structures this can lead to a huge increase in memory consumption, so it's not always a good idea.

## Exhaustive pattern matching

Rust's `match` expression is a more powerful version of the `switch` statement in other languages. One important property is that it is exhaustive, which means that all possible cases must be handled. Here's a code example:

```rust
enum Colour { Red, Green, Blue }

fn main() {
    let colour = Colour::Red;

    match colour {
        // Commenting out any of these lines causes a compile error.
        Colour::Red => println!("Red!"),
        Colour::Green => println!("Green!"),
        Colour::Blue => println!("Blue!"),
    }

    match colour {
        Colour::Red => println!("Red!"),
        // _ matches any pattern.
        _ => println!("A colour other than red!")
    }
}
```

Exhaustive pattern matching isn't a big deal when you know you haven't handled every case, as `_` is similar to the `default` case in a `switch` statement. However, it's very helpful in catching logic bugs where you think you've handled every case but haven't: I most commonly run into this when the type being matched has changed to add cases that didn't exist when I wrote the `match` expression.

While exhaustive pattern matching is a language feature that may not exist in any given language, I've found that I'm now more careful to consider all possible cases and how best to handle them. Depending on the language, it may also be possible to write switch statements in such a way that the type system checks for exhaustiveness (e.g. by returning a value from each case) or to lint for `switch` statements that are not exhaustive.

## Explicit error handling

Rust doesn't have exceptions: instead, it has panics and return values. Panics are, as the name suggests, for when things go so badly wrong that the situation is probably unrecoverable and the best thing to do is probably just crash the process. For things that might reasonably go wrong, you just represent that possibility in the return value.

Representing errors in return values is hardly new: languages like C and Go do the same thing, but their approaches have a few significant problems:

1. If the function must also return a success value, how do you differentiate between error and success and ensure they're mutually exclusive?
2. If the function doesn't return a success value, how do you guard against simply forgetting to check the return value?
3. Propagating errors often involves quite a lot of boilerplate, e.g. `if err != nil { return nil, err }`. I think it harms readability, because it's effectively noise that obscures the interesting, unique logic. In code review, I also find it's easy to start glossing over the boilerplate and so miss a case where it should be present but isn't.

Rust solves the first two problems by supplying the `Result` type in its standard library and using it pretty much everywhere. It looks like this:

```rust
#[must_use]
// Here T and E are type parameters that could be any two types (including the
// same type).
enum Result<T, E> {
    Ok(T),
    Err(E)
}
```

A function that returns a `Result` can either include a success value in the `Ok` variant or an error value in the `Err` variant. This solves the first problem.

The `#[must_use]` attribute causes the compiler to warn when a `Result` value is unused: this catches you if you forget to handle an error, and you can turn the warning into a compile error if you want. This solves the second problem.

Rust's solution to the third problem is the Try operator `?`, which returns early if the `Result` is an `Err`. Using it looks like this:

```rust
// () is the unit type, a.k.a. void. It looks like an empty tuple because
// they also can't have any value. We're using String as an error here for
// simplicity, but that's very bad practice in reality.
fn always_fails() -> Result<(), String> {
    // We don't need to scope Err like Result::Err because that's already done
    // by the compiler when it inserts the Rust prelude (which basically imports
    // a bunch of commonly-used types like Result and String into scope).
    Err(String::from("the function named always_fails failed! 🤯"))
}

fn may_fail(should_fail: bool) -> Result<(), String> {
    if should_fail {
        always_fails()?;
    }

    Ok(())
}

fn main() -> Result<(), String> {
    may_fail(true)
}
```

This ends up looking similar to code that uses exceptions except that:

1. Fallibility is a clear part of function signatures, you're not left wondering whether or not a function will throw an exception.

   C++ has the `throw` and `noexcept` specifiers, but these don't actually enforce the behaviour they describe at compile time. Java's checked exceptions are another approach to making fallibility part of the function signature, but is often too granular in the detail about the failure types it exposes.

   Rust's approach lets you use as vague an error type as you want: it just requires you to consider that an error of that type may occur. If you want to be specifics about the kinds of errors you could encounter, a common approach is to make the `E` in `Result<T, E>` an enum, with each error type getting a different variant.
2. Fallible function calls are obvious in the calling code: you either handle the error explicitly, or propagate it explicitly using the Try operator.

   With exceptions and `try {} catch {}` blocks you don't know which function(s) in the `try {}` block can throw the error caught, which can complicate the error handling logic.

This approach is very specific to the language, its idioms and their adoption by the language's ecosystem, but experience with it has made me think more about possible error states when writing in other languages, and to question whether an error state is better represented as a return value or an exception in languages that support exceptions.

## API design

### Making the best approach the obvious approach

Many languages that support generics have an option type, e.g. `Maybe`, `Option`, `Optional`. This type is used to indicate the presence or absence of a value. In C++, it's `std::optional<T>`, and here's the shortest, easiest way to use it:

```c++
std::optional<int> option;

// This prints the value held by option to stdout.
std::cout << *option << '\n';
```

Fun fact: the above code is not memory safe. The indirection operator `*` is part of the C++ language and is usually used to dereference pointers, but `std::optional<T>`'s overloaded implementation doesn't check if a value exists, and using it when one doesn't exist triggers undefined behaviour. The safe approach is to call `option.value()`, which will throw an exception if the optional contains no value. You could also first call `option.has_value()` or the `bool` operator to check if a value is present.

As an aside, you could avoid the memory unsafety by building your own option type using C++'s `std::variant`, which is type-safe. Presumably there's a good reason for `std::optional`'s design.

Java's `Optional` class avoids the memory unsafety, but like C++ it doesn't treat no value as a distinct case in the type system, so it again relies on an exception at runtime to catch misuse. Also, the variable holding your `Optional` could instead be `null`...

Rust's equivalent is its `Option` type, which looks like this:

```rust
// Here T is a type parameter representing any type.
enum Option<T> {
    None,
    Some(T)
}
```

Using an enum (which in Rust is a sum type) means that the two possible states are distinguishable to the compiler. This means you can check for validity at compile time by using pattern matching as you would for any enum:

```rust
fn main() {
    let option: Option<bool> = Option::None;

    // Here you don't get the value until you've checked that there is a value.
    if let Some(value) = option {
        println!("Option has {}", value);
    } else {
        println!("Option has no value");
    }

    // A match expression can also be used.
    match option {
        Some(value) => println!("Option has {}", value),
        None => println!("Option has no value")
    }
}
```

It's possible to just try getting the value out of the option like in C++ or Java by calling a function like `Option::unwrap()`, but that requires you to know such functions exist (as opposed to using language features) and is explicitly discouraged in favour of using pattern matching or other less risky alternatives. Importantly, none of the ways of accessing the `Option`'s value have the possibility of introducing memory unsafety.

This is just one example of how Rust's standard library is generally designed to nudge developers towards the best approach, and the overall improvement to my user experience as a Rust developer is significant. I've always borne usability in mind while designing APIs, but I've become more aware of this particular aspect since my introduction to Rust.

### Preventing API misuse

Making it easy to use APIs in ways that avoid problems is good, making it impossible to cause problems is better. Here are a couple of things I've seen in Rust that help with that.

#### Unsafe scopes

Not every memory-safe program can be proven safe by the Rust compiler. As such, Rust provides the [`unsafe` keyword](https://doc.rust-lang.org/book/ch19-01-unsafe-rust.html), which can be used to declare a scope in which a few potentially-memory-unsafe operations are allowed. It can be used in a few places:

* If used in a function signature (`unsafe fn ...`), you're telling the compiler that the caller must use it in a way that maintains the function's required contracts.
* If used in a trait declaration (`unsafe trait ...`), you're telling the compiler that the implementor must ensure the implementation maintains the trait's required contracts.
* If used in a trait implementation (`unsafe impl ...`), you're telling the compiler "trust me, I've verified that this implementation maintains the required contracts".
* If used in a block scope (`unsafe { ... }`), you're telling the compiler "trust me, I've verified that the required contracts of all unsafe operations performed in this block are maintained".

This feature is an important part of Rust's appeal, not just because there would be a lot that couldn't be done without it, but also because it allows potentially risky code to be signposted and encapsulated within a safe abstraction. This makes things like auditing risky code much easier to do.

Here's an example from the Book:

```rust
// A slice is a view into a contiguous sequence of elements (e.g. part of an
// array).
fn split_at_mut(slice: &mut [i32], mid: usize) -> (&mut [i32], &mut [i32]) {
    let len = slice.len();
    // Getting a pointer isn't unsafe.
    let ptr = slice.as_mut_ptr();

    assert!(mid <= len);

    unsafe {
        // This code is potentially unsafe for two reasons:
        // 1. If mid > len then you've got a buffer overflow.
        // 2. Creating two mutable references to two subslices violates the
        //    'only one mutable reference' rule, unless the subslices do not
        //    overlap (because then you can never end up with two mut refs to
        //    the same address in memory).
        // Since the assert above catches the first case and the code obviously
        // doesn't fall foul of the second, we can encapsulate the unsafe code.
        (
            std::slice::from_raw_parts_mut(ptr, mid),
            std::slice::from_raw_parts_mut(ptr.add(mid), len - mid),
        )
    }
}
```

By encapsulating the unsafe code within a safe abstraction, it means the unsafe code cannot be misused. If something *does* end up going wrong and you get a segmentation fault or some other indicator of memory unsafety, you just need to look at the code that encapsulates `unsafe` blocks to find the cause.

GC'ed languages only tend to allow access to potentially memory-unsafe options through specific APIs, which provide similar advantages. However, memory safety is only one type of safety, and the general point I took from Rust is how encapsulation and abstractions can be used to make APIs that are resistant to misuse, and how I can apply that when designing an API, e.g.

* Does this API allow an invalid combination of inputs?
* Can I keep this API private and instead expose a set of wrapper APIs that only allow different valid combinations of inputs?
* Can I use static typing to restrict the possible set of values given?
* If I'm already using static typing, can the types involved be made more specific to how they're used? Note that this isn't the same as making the types more specific: it's about identifying the smallest possible interfaces.

#### Typestates

Typestates are what you get when you represent state using the type system. They allow you to do things like restrict when methods can be called, similarly to how typed function arguments allow you to restrict what values you can call a function with. Here's an example:

```rust
struct Door { number: u8 }

// Define a bunch of tuple structs to describe the door's states.
struct OpenDoor(Door);
struct ClosedDoor(Door);
struct LockedDoor(Door);

impl OpenDoor {
    fn close(self) -> ClosedDoor {
        // With tuple structs we reference fields using their indices.
        ClosedDoor(self.0)
    }
}

impl ClosedDoor {
    fn open(self) -> OpenDoor {
        OpenDoor(self.0)
    }

    fn lock(self) -> LockedDoor {
        LockedDoor(self.0)
    }
}

impl LockedDoor {
    fn unlock(self) -> ClosedDoor {
        ClosedDoor(self.0)
    }
}

fn main() {
    let closed_door = ClosedDoor(Door { number: 1 });

    // We can't close a door that is already closed.
    // closed_door.close();

    // We can open a closed door.
    let opened_door = closed_door.open();
    // Thanks to Rust's ownership system, we can't open a closed door twice.
    // closed_door.open();

    // Now that the door is opened, we can close it.
    let closed_door = opened_door.close();

    // Now let's lock it.
    closed_door.lock();
}
```

Here I've used three different structs to define the different states, but you can also use a single struct that is generic over a state type. It involves a few concepts I haven't mentioned yet, but you can see an example [here](https://gist.github.com/Ortham/e8942d622d91e2e87a3c5b7f6545d745).

This pattern is a little less useful in languages that lack affine or linear type systems, which is what prevents us from opening the closed door twice in the example above. Move semantics aren't enough, as C++ still allows you to access the original. Even so, using typestates reduces the opportunities to introduce logic bugs in all sorts of situations. For example, it would be great if Node.js used them to prevent code from trying to set response headers after they've already been sent, instead of throwing an exception at runtime.

## Conclusion

If there's a general theme to the examples and points I've made above, it's that restricting what's possible is very useful when trying to build robust and maintainable software. Using the type system and other language features to encode and enforce invariants effectively eliminates the possibility of bugs due to those invariants being violated. This is particularly significant when it comes to writing code that has a high cost associated with failure, that will be maintained for a long time, or which experiences a lot of churn.

Static typing is a great example of a widely-available language feature that can be used in this way. In a similar vein, getting to grips with the other restrictions that Rust imposes means that you almost paradoxically have to think about less when reading and writing Rust code: you know that the compiler will yell at you if you get lifetimes wrong, try to mutate something when you can't, or try to use unsafe code in a safe context.

Most of my "in other languages..." points above boil down to "think about this more", which is not hugely inspiring. Perhaps the real lesson from Rust is that better tools exist, and it may be worth learning to use them. 🤔
