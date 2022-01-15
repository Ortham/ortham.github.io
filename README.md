This is a Jekyll site, the easiest way to build it is using Docker:

```
docker run --rm -v ${PWD}:/srv/jekyll -v jekyll_bundle:/usr/local/bundle -p 4000:4000 -it jekyll/jekyll:3.8.6 jekyll serve --no-watch
```

The Docker container tag should match the version of `jekyll` listed [here](https://pages.github.com/versions/), but at time of writing that page gives the version as `3.9.0`, and there is no corresponding Docker image tagged.
