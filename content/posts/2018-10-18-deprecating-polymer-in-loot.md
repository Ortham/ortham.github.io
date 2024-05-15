---
title: Deprecating Polymer in LOOT
date: 2018-10-18
summary: Closing a chapter in LOOT's GUI development.
categories:
   - LOOT
aliases:
  - /2018/10/18/deprecating-polymer-in-loot.html
---

In LOOT v0.7.0, I implemented a new GUI built on top of Google's Polymer
framework. At the time, Polymer was still in pre-alpha at v0.5, and in the years
since it's had several major releases, with v3 arriving earlier this year.
Although LOOT v0.13 still uses Polymer, I'm unhappy with how things have turned
out, and plan to use something else in the future. This post is about why.

## Use The Platform? What Platform?

The Polymer team's motto is "Use The Platform", the idea being that the
framework should align as closely as possible to, and take advantage of, the web
platform's features, instead of doing its own thing. I like this approach, it's
one of the main things that lead to me picking Polymer over the alternatives. On
a conceptual level, it makes more sense to me to build on top of what the
platform provides than to create new idioms and to some extent reinvent the
wheel.

One problem is that "using the platform" currently means using polyfills on any
browser that isn't Chrome or the latest version of Safari. On the one hand,
Polymer doesn't use anything in Chrome that other browsers haven't said they'll
support. On the other hand, that hasn't happened yet and there's no guarantee it
will, so Google are trying to get people to build sites on tech that only really
works in their browser. Polyfills aren't perfect, and can lead to a degraded
user experience, potentially pushing people who browse those sites towards
Chrome...

A more immediate problem is that for all the talk about web apps, the platform
just doesn't seem to be very good for application development, compared to
native application development. Building blocks like data binding and virtual
lists aren't available, accessibility is an extra and performance is a major
concern.

This means Polymer needs to do more itself, and after a few years of experience
with it and a few alternatives, I don't think its approach is best. Polymer has
stuck as close to HTML as possible, using HTML templates to define the shadow
DOM of custom elements, adding new (non-standards-conformant) attributes, and
using `[[one-way]]` and `{{two-way}}` data binding
variables in attribute values.

I think this has just served to highlight how poorly HTML serves the needs of
dynamic applications. It's great at describing the structure and attributes of a
static document, and describing the structure of applications that remain fairly
static, but attributes aren't able to properly represent non-trivial states, and
there's no way to represent the page as a dynamic view that's driven by a data
model, the view and data are too tightly coupled. For example, in Polymer
data-bound attribute values are serialised from the underlying JavaScript
values, which is an inefficient and ugly way to pass data around.

## Mercurial, Uncommunicative Development

Polymer is rife with a willingness to build on top of very unstable foundations,
then expose those foundations as part of its API. This means that Polymer itself
ends up very unstable, which makes for a poor developer experience. In the past
three years, Polymer has reached 1.0 and had two releases that introduced major
breaking changes. I think both were necessary and moved in the right direction,
but only because of design decisions that Polymer's had to walk back from.

A good example of this was Polymer's usage of HTML Imports. Before Polymer v3,
Polymer relied on HTML Imports to load elements, scripts and CSS through
imported HTML documents. Only Chrome implemented support for HTML Imports
though, and after a couple of years of no other browser also signalling support,
Polymer v3 dropped them to use ES modules instead. This wholesale shift in how
Polymer elements are defined and used meant that Polymer v3 is incompatible with
earlier versions, splitting an already tiny ecosystem: if you upgrade to v3, all
your elements need to be v3 elements too, and an element can't be a v2/v3 hybrid
like they could for Polymer v1 and v2. To add to the difficulty, v3 was released
in May, but it wasn't until September until the official elements had v3
releases, and in the months between there was almost no communication from the
Polymer team about when the elements would be available.

It doesn't seem like the Polymer team really learned from that,
because as well as polyfills for platform features like Custom Elements and
Shadow DOM, Polymer also uses [CSS apply
rules](https://tabatkins.github.io/specs/css-apply-rule/). This was a proposed
CSS feature, but it's officially been abandoned after it turned out to be a bad
idea and received no support from browsers other than Chrome. Does that seem
familiar? CSS apply rules are still part of Polymer, but how long until the team
decide to drop support for them for the same reason?

## It's a Dead End

It turns out that doesn't really matter, because the Polymer team has
effectively deprecated in favour of
[LitElement](https://github.com/Polymer/lit-element), and its official elements
are deprecated in favour of [Material Web
Components](https://github.com/material-components/material-components-web-components),
with new projects encouraged to use them instead. Continuing the theme of
instability, neither LitElement nor Material Web Components have reached 1.0
yet. Personally, the expression "once bitten, twice shy" comes to mind.

Software has a lifecycle, it lives and dies and we move on to alternatives when
it does, but "move fast and break things" doesn't seem like a great idea if
you're trying to get developers to build an ecosystem of elements around your
library, and the stuff you're breaking is their code. I'd much rather jump ship
to a library that understands this. Maybe one with a [huge market share and much
higher developer
satisfaction](https://2017.stateofjs.com/2017/front-end/results)?

## An Escape Hatch

The good news in all of this is that Polymer v3 makes it much easier to migrate
away from Polymer. By switching from Bower and HTML Imports to NPM and ES
modules, using it is now much more like using the wider JS ecosystem, so it's
easier to interoperate with other libraries, and to integrate with workflows
using tools like Webpack and Babel.

LOOT v0.13.4 has a couple of good examples of this in action. The first is that
previously, building the UI involved walking the tree of HTML imports and
`<script>` tags and copying all the referenced files into an output directory,
then running Webpack to bundle all the 'normal' JavaScript library dependencies
into one JS file in the output directory. Now that Polymer also uses ES modules,
everything can be done through Webpack, which is more consistent, faster and
produces smaller output.

The other example is that LOOT used to use [a third-party Polymer v2 element](https://github.com/ellipticaljs/paper-autocomplete) to
provide autocomplete suggestions in a dropdown menu, but it wasn't made available
as a v3 element. Instead of porting it to v3 myself, I decided to write a React
component instead. The only issue I came across is that React's event system
means that you need to be careful about how events interact with the Shadow DOM
that's used by Polymer elements, as React events behave differently from native
events.

I'd like to gradually move more of LOOT's GUI away from Polymer, though I'm not
set on React specifically. Whatever I pick, I think that I'd like to end up less
tied to it than I've been to Polymer. If there's anything I've learned, it's
that there's no knowing what the future will bring, especially when it comes to
web development.
