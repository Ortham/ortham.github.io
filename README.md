This site is generated using [Hugo](https://gohugo.io). The easiest way to build it is to:

1. Download a [prebuilt Hugo binary](https://github.com/gohugoio/hugo/releases/latest).
2. Add the binary to your `PATH`.
3. Run `hugo` from the root of this repository.

Hugo will create the generated site in the `public` folder.

## Theme-specific features

Some features rely on theme-specific params, configuration or partial templates:

- `assets/css/custom.css`, `assets/icons/paypal.svg`, `layouts/partials/extend-footer.html` and `layouts/partials/extend-head.html` are loaded by the theme.
- `params.showPagination`, `params.groupByYear`, `params.showDate`, `params.showDateUpdated`, `params.showReadingTime` and `params.showTableOfContents` are used by the theme's layouts.
- There are several theme-specific settings in `hugo.toml`.
