---
title:  "Introducing Buddah"
date:   2016-05-01
summary: A simple registry for community-made game modding software.
---

[Buddah](https://wrinklyninja.github.io/buddah/) is a new website of mine that provides a searchable registry/list of modding-related software. It's also a [GitHub repository](https://github.com/WrinklyNinja/buddah). I've created it to help software developers wanting to write modding-related software find out what already exists, and so avoid reinventing the wheel.

Buddah's design is inspired by the websites for the [NPM](npmjs.com) and [Bower](http://bower.io/) package managers. However, Buddah is not related to any package manager, and it's not a project hosting or publishing site. It's a static site that only stores metadata on the projects it lists, and projects don't need to be "release-ready" to be registered. As stated in the contributing guide, the only requirement is that projects are software related modding a game. They can be for any game, open or closed source, and in any state of completion.

## The Past

I had the idea to create Buddah when discussing the addition of BA2 file support to [libbsa](https://github.com/WrinklyNinja/libbsa) with @matortheeternal, @sharlikran and @jonwd7, and what parsers were already available. One of the problems we had was that we just didn't really know what was out there, and we didn't want to end up repeating work that someone else had already done. Sites like Nexus Mods provide hosting for modding utilities, but they're not really suitable for software libraries or incomplete code, and searching using the likes of Google or GitHub returns many more projects that are unrelated to modding than those that are, making the situation a bit like looking for a needle in a haystack.

To that end, I decided to create a simple Markdown list of known Elder Scrolls (and Fallout) modding tools and libraries that others could contribute to, so that in the future there could be a single location we could refer to when looking for prior work. I named the repository and list "ES Modding Tools", and started adding projects to it under different headings based on what the projects did (eg. one for BSAs, one for mod management, etc.).

As I added to the list, I noticed that some projects could be listed under multiple headings. To avoid repeating entries, I reimplemented the list as a JSON dataset, with each project entry listing the sections it should appear under, and used the dataset to construct and display the list on a web page hosted using GitHub Pages (much like this site is).

It then became apparent that there were quite a few more projects out there than I had thought, and the list was becoming too long to browse comfortably. I therefore switched to a search-based UI, where the section names became keywords, very similar to the current implementation. Searching is implemented [lunr.js](lunrjs.com) to provide relevance weighting.

At this point, the site was still called ES Modding Tools, which was appropriate but not terribly snappy. Then I woke up one morning with two thoughts: firstly, that there wasn't any need to restrict the site to only Elder Scrolls and Fallout modding software, and secondly, that I was essentially building a list of links, and so I could hardly do better than to name it after Buddah.

For those who don't know, Buddah was a member of the Oblivion modding community (and others, but that's where I knew him) who maintained a spreadsheet list of links for over 16,000 Oblivion mods, and he used it to help people find mods they were looking for but had forgotten the names of or couldn't otherwise find. Sadly, he passed away in 2015, but hopefully he'd like of what I've built.

## The Future

The key to Buddah's success is awareness amongst modding communities: for it to be useful, developers need to know it exists, and projects need to be registered on the site. I haven't done much to promote the site (marketing isn't nearly as interesting to me as creating is), but I'll probably do something about that sooner rather than later.

If the site is successful, I'll need to keep an eye on its performance. Because it's a static site, everything is done client-side, so the JSON dataset needs to be downloaded, indexed and search in web browsers. With the current size of the dataset, there aren't any performance issues, but if it increases significantly, I will need to look into minifying the dataset (GitHub already uses gzip compression), paginating the entry list, and possibly even moving to a server-side search infrastructure.

I'd also like to make it easier to register projects: not everyone uses GitHub, and having some way of submitting pull requests without an account, possibly even from the website itself, would be great. I've got an idea to use a robot account and GitHub's API to submit pull requests, but I'm not sure how feasible that is, and it needs more investigation.
