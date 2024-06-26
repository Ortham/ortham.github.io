These files were originally downloaded from the NPM registry at <https://registry.npmjs.org/mermaid/-/mermaid-10.9.1.tgz>.

To update to a newer version, open https://registry.npmjs.org/mermaid, and the tarball's download URL can be found at `.versions.[version].dist.tarball` in the JSON response, replacing `[version]` with the version number you want.

The JS files committed are the minimal set needed to provide the functionality that this site uses, as the full tarball is much larger.

When making use of Mermaid or updating the vendored version, bear in mind that the modules that the browser attempts to load are dependent on what functionality is used, e.g. flow diagrams and sequence diagrams load different modules.
