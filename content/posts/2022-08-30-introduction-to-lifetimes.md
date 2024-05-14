---
title: An introduction to lifetimes
date: 2022-08-30
summary: Resource management, why it matters, and a few helpful concepts.
aliases:
  - /2022/08/30/introduction-to-lifetimes.html
---

## What is resource management?

A resource is something that can be acquired by your program, held onto, and then released. Examples include:

* Memory
* File handles
* Sockets & connections (e.g. TCP, HTTP, DB)
* Locks (e.g. thread locks, transaction locks, anything that makes a series of operations look atomic)

For many resources the source system is the OS your program is running in, but it can be more abstract: many locks are just held in a program's memory.

Resource management is about making sure you acquire resources when you need them, and releasing them when you don't need them any more.

## Why is resource management important?

It might not be! For example, a common strategy for high-performance, short-lived programs is to allocate memory but never free it, because freeing memory takes time and the operating system will free it anyway when the program's process ends. So long as you've got enough memory (and don't care about anything else running on the system), that works perfectly well.

However, if you've got long-running programs (e.g. a server), continuously increasing your memory usage is... not great. The same is true for other resources: your OS has file handle and socket limits, and you don't want your program breaking because they've been reached.

## Lifetimes

Every resource has a lifetime, i.e. how long your program holds onto it. The trick is knowing what a resource's lifetime is, and controlling it to suit your needs. You don't necessarily want to minimise a resource's lifetime. For example, it's generally better to share connections between requests than to open a new one every time. At the same time, you generally don't want to hold onto a resource indefinitely if it's not being used, because then it's just being wasted.

There are two common approaches to managing resource lifetimes:

1. Manually
2. Tying a resource's lifetime to a variable's scope

### Manually

```java
CloseableHttpClient client = null;
CloseableHttpResponse response = null;
final var request = buildRequest();

try {
    client = HttpClients.createDefault();
    response = client.execute(request);

    // Process response...
} finally {
    // Close resources whether or not any exceptions were thrown.
    if (client != null) {
        client.close();
    }

    if (response != null) {
        response.close();
    }
}
```

Manual resource management is generally risky, avoid it if possible. It's all too easy to forget to release a resource, or that you've already released a resource.

Even in managed languages, such mistakes can cause crashes, systems to run out of resources, and workloads to get into broken states. Resource mismanagement is often an under-appreciated failure scenario, until it's 2 AM and the sky is falling down. It also wastes money, especially if you're running in the cloud.

### Scoped resources

```java
final var request = buildRequest();

try (final var client = HttpClients.createDefault();
    final var response = client.execute(request)) {
    // Process response...
}
```

Java's try-with-resources blocks and Python's `with` statements are a way of tying a resource's lifetime to the scope of the variable representing that resource: once the variable goes out of scope, the resource it represents is automatically released.

This is a huge improvement over manual management: you can't forget to close the resource, even if an exception is thrown, and it's harder to use the resource after it's closed.

There are a couple of downsides:

* In Java, not every class that represents a resource can be used with try-with-resources, but it's often possible to write a wrapper class that can.
* It's not always possible to use scoped resources, e.g. if you're implementing a connection pool, the connections in that pool don't have a neatly defined scope. The pool itself could be represented as a scoped resource though, and closing it should release all its connections.

#### Resource Acquisition Is Initialisation

Special mention goes to the Resource Acquisition Is Initialisation (RAII) idiom, which loosely means that initialising a value that represents a resource should acquire that resource, and that when that value is destroyed the resource should be released. This idiom comes from C++, where it is implemented using constructors and destructors.

```c++
class LockGuard {
public:
  // The constructor stores a reference to the mutex and locks it.
  LockGuard(std::mutex& m) : mutex(m) { mutex.lock(); }

  // The destructor unlocks the mutex.
  ~LockGuard() { mutex.unlock(); }

private:
  std::mutex& mutex;
};

// Pretend atomics don't exist.
class ThreadSafeCounter {
public:
  void increment() {
    // The mutex is locked when guard is created and unlocked when guard is
    // destroyed (when it goes out of scope, i.e. when increment() returns).
    LockGuard guard(mutex);
    counter += 1;
  }

private:
  int counter{0};
  std::mutex mutex;
};
```

Note that you can't use Java finalisers like this, because they're only run when an object is garbage-collected, which may never happen. C++ destructors are run far more predictably.

This idiom can be used to manage any resource, including memory. However, it relies on the value implementing the idiom to be stack-allocated, so doesn't really appear in garbage-collected languages.

## Ownership

One thing I've alluded to above is that when resources are being managed, something is responsible for doing the management. That something is the resource's owner. All other things that interact with the resource do so by referring to it without assuming ownership of it.

A resource doesn't *need* to have a single owner, but it usually helps to have a single owner and be clear about what that owner is.

For a garbage-collected language, you can think of the garbage collector as the owner of all the program's memory: it hands out references to all object data to variables, and only releases a block of memory once there are no variables that refer to it.

You could argue that try-with-resources makes the Java runtime the owner of the resources it's used with: your code is no longer responsible for releasing them.

Going back to the connection pool example, the pool should own all the connections in it, and be soley responsible for acquiring and releasing them. Ideally, the connections would only expose the ability to be closed to the pool and not anywhere else that might get hold of a connection, but that's often not practical. In that case, ownership of its connections should be a documented part of the pool's API to help avoid misuse.

Together, the concepts of ownership and lifetimes can help you model resource management.

## Invalid References

It's often possible to create a reference to a resource that outlives the resource. This leaves the reference in an invalid state.

When using Java's try-with-resources, that can be done by assigning to a variable in the parent scope:

```java
final var request = buildRequest();
CloseableHttpResponse outerResponse = null;

try (final var client = HttpClients.createDefault();
    final var response = client.execute(request)) {
    outerResponse = response;
}

// outerResponse now refers to a resource that has been released.
```

Another example is iterator invalidation:

```java
var array = new ArrayList<Integer>();
array.add(1);

var iterator = array.iterator();
while (iterator.hasNext()) {
    iterator.next();

    // This causes a ConcurrentModificationException to be thrown, as otherwise
    // the iterator would be a reference to a position in a sequence that is
    // no longer valid.
    array.add(4);
}
```

So, a robust resource management system needs to keep track of:

- A resource's owner
- The lifetime of the resource
- The lifetimes of any references to the resource

Depending on what needs to be constrained, it can then choose to only release the resource once there are no living references to it, or prevent the creation of references that will outlive the resource.

Garbage collectors and reference counting do the former. Is there a system that does the latter? Yes!

## Rust

The [Rust programming language](https://www.rust-lang.org/) has ownership and references as language features, and has a few simple rules for them:

* Each value in Rust has a variable that’s called its owner.
* There can only be one owner at a time.
* When the owner goes out of scope, the value will be dropped (i.e. deallocated).
* At any given time, you can have either one mutable reference or any number of immutable references to a value.
* References must always be valid.

These rules are enforced at compile time. This is possible because Rust's type system differentiates between variables that own values and those that "borrow" references to values.

This system is used to guarantee memory safety without a garbage collector, but that's not all: the compiler also enforces thread safety, and the standard library includes types that allow the compiler to enforce I/O safety when using them.

Nothing in life is truly free though, and having these rules enforced means that some data structures and patterns can be pretty painful to implement. I wouldn't recommend Rust as a language for writing your average web service in, but it has a lot going for it, and if efficient use of resources and correctness are priorities, I think it's hard to beat.

## In Summary

* Memory probably isn't the only resource your program uses.
* Garbage collection means you often don't need to think about memory management, but it does nothing to help with other kinds of resource.
* When you're handling a resource, it can help to think about how long it should be held onto, and what is responsible for managing the resource.
* Preferring to using language features that avoid having to manually release resources once they're no longer needed is a good way to avoid mistakes.
* Rust may be a good pick when correct and efficient resource management is important.
