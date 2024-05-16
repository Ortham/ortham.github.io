---
title: Moving from Jekyll to Hugo
date: 2024-05-16
summary: Improving my user experience on Windows.
---

Yep, I've reimplemented my blog (again) and written a post about it (again): this website is now generated using [Hugo](https://gohugo.io/).

## Why the change?

I've generated the site using [Jekyll](https://jekyllrb.com/) for [almost a decade]({{< ref "2014-09-11-new-site" >}}), and though I've made a couple of [significant]({{< ref "2015-08-23-site-updated" >}}) [changes]({{< ref "2018-10-09-it-lives" >}}) in that time, it's not seen major work since 2018. However, I've recently gotten tired of the poor developer experience on Windows.

Jekyll doesn't officially support Windows, and though there are [instructions](https://jekyllrb.com/docs/installation/windows/) for installing it on Windows, they involve installing the Ruby devkit, which seems like it shouldn't be necessary - I'm trying to run a Ruby application, not write one!

I did used to install Jekyll like that, but it was the only reason I had Ruby installed and I'm pretty sure I ran into issues with dependencies that didn't support Windows properly and dependency management issues with bundler: it was generally a faff. Instead, for the last few years I've built the site locally using a Docker container, which solved those problems but:

- the Jekyll version available as a Docker image didn't match what GitHub Pages used, so I've run into mismatches once or twice
- hot-reloading (a.k.a. 'watch') didn't work
- the build process takes 2 minutes: 1:15 just to start installing dependencies, 35 seconds to install them, and then 10 seconds to do the actual Jekyll build. The Docker container is supposed to cache dependencies in a volume, but that doesn't seem to work, and I think the incredibly slow start is due to the combination of the Windows filesystem and WSL 2 (which Docker uses) communication with it having so much overhead.

I could use WSL 2, but that's basically what Docker is doing so I doubt it would be much different. I finally got sick of having to spin up Docker and waiting for builds and had a look around at other options.

## Why Hugo?

I'd heard of Hugo before, and while it does market itself as being very fast, I didn't actually care too much about that: if I could easily and reliably run Jekyll directly in Windows, a 10 second build would be fine.

What really drew me to Hugo was:

- It supports Windows
- It's a single executable, so installation is trivial.

So, Hugo's popular and it seemed like it would fix my main gripes with Jekyll. I had a look at its features and fortunately just about everything that I was using Jekyll for had built-in support: the only exception was automatically turning @mentions into links to GitHub profile pages, but a simple regex search and replace is enough to handle that.

## The conversion

Hugo's docs were generally very useful and easy to both follow and dip in and out of, so while there were lots of differences the conversion process was generally smooth. It was particularly helpful to have pages on handling Mermaid, MathJax and GitHub Pages integration.

I was also able to preserve URL paths for all my pages (except one, which I intentionally changed), in part using Hugo's support for aliases.

### Issues fixed

After the relatively mechanical conversion of directory structures and template formatting and translating configuration, I went through the site page by page comparing the Jekyll and Hugo versions, playing spot-the-difference.

I did spot a few new issues:

- Jekyll's Markdown renderer would pass everything between HTML opening and closing tags through unchanged, but Hugo's would end that context at the first double line break instead of the closing tag, so if the next line was indented it would be treated as a code block. I had to remove some line breaks and move some inline scripts into JS files to get around that.
- Jekyll's Markdown renderer had an extension for abbreviations, but Hugo's doesn't, so I had to use `<abbr>` instead.
- I also found that Hugo's table of contents generation would preserve the HTML content of headings, and in some cases I put links in headings, so clicking on a heading in the table of contents ended up navigating to that heading's link instead of the heading itself. I had to move the links out of headings to avoid that issue.
- My inline maths became rendered as blocks by MathJax: I didn't change MathJax and it turns out I was using the block escapes, so I think Jekyll's templating may have been turning them into inline escapes before.
- There were a few cases where I had escaped examples of Jekyll's templating syntax that no longer needed to be escaped, and the escape syntax was showing up as literal text.
- Some of my date metadata included times, which Hugo didn't like.

However, as I went through the site I noticed more stuff that was already broken:

- I had a lot of internal links that used hardcoded paths, which were relatively brittle.
- I had several external links that had no schema and so which were interpreted as internal links.
- One of the Mermaid graphs diagrams was broken.
- The D3 charts didn't properly fit the page width, and were unreadable due to the site using a dark theme and the charts using black text.

I also took the opportunity to make some updates, like replacing updating HTTP URLs to use HTTPS where available and replacing emoji shortcodes with their Unicode equivalents.

### Theming

It did take several hours to migrate the site, but a large chunk of that time was spent browsing for a theme I liked and trying a few out. My chosen theme has support for dynamically switching between dark and light modes, so I also spent some time hooking Mermaid up to that to re-theme its diagrams when the mode changed.

---

With that, the cycle is complete. How long until I write the next one of these posts?
