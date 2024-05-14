This site is generated using [Hugo](https://gohugo.io). The easiest way to build it is to:

1. Download a [prebuilt Hugo binary](https://github.com/gohugoio/hugo/releases/latest).
2. Add the binary to your `PATH`.
3. Run `hugo` from the root of this repository.

Hugo will create the generated site in the `public` folder.

## Theme-specific features

Some features rely on theme-specific params, configuration or partial templates. They are:

- `i18n/en.toml` is used to override the text that the theme displays for its generated tables of contents.
- `layouts/partials/site-scripts.html` is used to insert content into the page `<head>`.
- `params.ananke_socials` is used to configure the "social" links that get displayed by the theme in the header and footer.
- `parms.show_reading_time` in post front matters is used to control whether a reading time estimate is shown for that post. It's currently cascaded down to all posts.
- `params.toc` in post front matters is used to control whether a table of contents is generated for that post.
