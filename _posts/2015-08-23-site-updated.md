---
title:  Site Updated
date:   2015-08-23
excerpt: Now using Pixyll v2.3.
---

This site is now based off Pixyll v2.3!

## Forking, Not Overwriting

Previously, the site was based off Pixyll 1.0, as detailed [here]({% post_url 2014-09-11-new-site %}). This was done just by adding the Pixyll files to this site's repository, but this made it difficult to incorporate new changes made in Pixyll. As I made my own tweaks to the site, these would conflict with Pixyll's changes, and because the repository contained no Pixyll history, I couldn't do a merge or rebase and only resolve the new conflicts. Instead I had to drag in a new release's files and resolve a much larger set of conflicts.

For the update to v2.3, I instead removed the initial commit adding the original Pixyll files, and rebased on top of the Pixyll `2.3.0` tagged commit. Now my site is effectively a fork of Pixyll, and that makes it much easier to

* contribute back to Pixyll if I do have any further contributions to make
* update my own Pixyll base with others' contributions

## Style Changes

Pixyll v2.3 makes significant changes to the site implementation and styling, compared to v1.0.

1. There's less white space, improving information density while still looking good.
2. Syntax highlighting has been restyled to look prettier, though unfortunately it only seems to work with Liquid code blocks, and not GitHub Flavored Markdown code blocks, so I don't see the improvements.
3. The styling is implemented completely in SCSS, which has first-class support in Jekyll, and this makes it easier to tweak Pixyll's styling globally using a handy set of variables that have been provided.

There are also a few styling changes I'm on the fence about:

1. Table styling has been altered: to be honest I prefer the less line-heavy styling used before. It was evocative of those created by LaTeX's *booktabs* package, which I consider to be the best-looking tables I've seen.
2. The social and donation buttons at the top of each page have been centered and split across two lines. This makes sense over the single left/right split line that was merged from my original pull request, as people have since contributed many other icons, and there just wouldn't be enough space using the old layout if many of the icons were used. I still think it looks a bit odd though.

As time goes by I'll no doubt tweak the design to my own taste though.
