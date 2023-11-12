This is a Jekyll site, the easiest way to build it is using Docker:

```
docker run --rm -v ${PWD}:/srv/jekyll -v jekyll_bundle:/usr/local/bundle -p 4000:4000 -it jekyll/jekyll:4.2.2 bundle add webrick && jekyll serve --no-watch
```

The Docker container tag should match the version of `jekyll` listed [here](https://pages.github.com/versions/), but at time of writing that page gives the version as `3.9.3`, and there is no corresponding Docker image tagged, and 3.8.6 uses a Ruby version that's too old.
