---
title:  "New: Pseudosem"
date:   2015-08-24
summary: A library for permissive semantic version comparison in C++11.
aliases:
  - /2015/08/24/pseudosem.html
---

LOOT's version string comparison algorithm has been split into its own library, [Pseudosem](https://github.com/Ortham/pseudosem)! It's a header-only C++11 library that comes with a suite of tests, and implements version comparison as described by [Semantic Versioning](https://semver.org/), but with some extensions to the allowed syntax to accommodate most forms of version strings (hence "permissive").

The syntax extensions are:

* Leading zeroes (eg. `0.05.1`)
* Arbitrary number of release version parts (eg. `1.2.3.4.5`)
* Space, colon, hyphen and underscore prerelease separators (eg. `1.0.0 alpha:1-2_3`)
* Case insensitivity

Usage is simple, there's a single C-like compare function:

```c++
#include <pseudosem.h>
#include <iostream>

int main() {
    std::string v1("1.0.0");
    std::string v2("2.4.0");

    int result = pseudosem::compare(v1, v2);

    if (result < 0)
        std::cout << "v1 is an earlier version than v2";
    else if (result == 0)
        std::cout << "v1 is an equivalent version to v2";
    else
        std::cout << "v1 is a later version than v2";

    return 0;
}
```

The above will print `v1 is an earlier version than v2`, obviously.

I split it from LOOT's code because BOSS's new developer is interested in using the same code for BOSS, since its existing version comparison is a little broken. Hopefully it'll turn out to be a generally useful thing beyond that.
