---
title:  "BOSS vs. LOOT In Numbers"
date:   2015-03-11
summary: "Analysing the stats, one year on."
categories:
   - LOOT
aliases:
  - /2015/03/11/boss-vs-loot-one-year-on.html
---

LOOT's first release, v0.5.0, was made on the 31st of March, 2014. Almost one year on, I thought I'd take a look at some stats to see how it's performing against its predecessor, BOSS.

## Download Counts

The release download numbers can be obtained using GitHub's Releases API, eg.

<script src="https://gist.github.com/Ortham/62888dd1228b6631c5f0.js"></script>

### Average Daily Download Rates

<div id="averageDailyDownloadsChart"></div>
<script type="module" src="scripts/download-rates.js"></script>

These values are obtained by dividing total downloads by number of days since release. Actual download rates will decrease over time, but this merely a better representation of popularity than raw download numbers. The graph shows that BOSS's popularity is declining while LOOT's increases. I expect that LOOT's upcoming v0.7.0 release will outstrip BOSS for the first time.

## Contributions

Masterlist contributions are a useful metric because they give some insight into what people are interested in and value, given that contributing requires effort and is not particularly fun. I could have gotten the data using GitHub's [Statistics API](https://developer.github.com/v3/repos/statistics/), but I counted them manually using the graphs available for each repository ([example](https://github.com/loot/skyrim/graphs/contributors?from=2014-03-11&to=2015-03-11&type=c)).

### LOOT Masterlists Line Difference

<div id="commitsChart"></div>
<script type="module" src="scripts/masterlist-lines.js"></script>

The above graph shows the number of lines added or removed over the last two years. The scale is non-linear so that the BOSS 2013-2014 changes to the Skyrim masterlist don't make everything else too small to see.

While the data used do not distinguish between the masterlists and other files in the repositories, changes to other files are negligible.

The above shows that:

* Fallout 3 and Fallout: New Vegas are enjoying a large boost in contributions. LOOT seems to have effectively replaced BOSS in those games' modding communities, as the contributions to BOSS's Fallout: New Vegas masterlist are ports of those made to LOOT.
* Oblivion is also experiencing an uptick in contributions, mostly for BOSS, though its heyday remains in the pre-2013 period.
* Skyrim's contributions have seen the most dramatic change by far. Like for the Fallout games, BOSS has effectively been abandoned in favour of LOOT. The LOOT masterlist shrinkage will be due to better use of the LOOT masterlist format's various anti-redundancy features.

These results make sense:

1. My personal experience with Fallout 3 and Fallout: New Vegas is that modding never really took off with them like it did for Oblivion and Skyrim. There was very little historical maintenance of BOSS's masterlists for the Fallout games, so with LOOT requiring less maintenance to work well and not much to lose by switching, it's clearly a more attractive choice for users and contributors alike.
2. The consensus in the Oblivion modding community seems to be that BOSS is good enough for their needs, and there's little interest in making the necessary corrections to LOOT's masterlist for it to properly support the wide range of very complex mods that exist (eg. FCOM).
3. LOOT was created primarily as a solution to the problems BOSS encountered with Skyrim, chief of which was the maintenance cost, so it's little surprise everyone jumped ship.


## Masterlist Repository Clones

LOOT masterlist repository clones are a useful metric as when LOOT initially downloads a game's masterlist, it does so via a Git clone operation, so there's a strong correlation between new users and clones. Unfortunately, BOSS bundles its masterlist repositories in its releases to speed up the first run, but this means that there is no initial clone and so the clone rate data for the BOSS repositories can't be used for comparison. All data was obtained through the repository traffic graphs ([example](https://github.com/loot/skyrim/graphs/traffic)).

### Average Daily Clone Rate

<div id="averageDailyClonesChart"></div>
<script type="module" src="scripts/daily-clones.js"></script>

The graph above shows that Skyrim is (predictably) the game LOOT is most used for. The total number of clones per day comes out as ~ 2642, which is just slightly more than the number of downloads per day for LOOT's v0.6.1 release: this makes sense, since the majority of recent downloads will be of the latest release. The difference may be due to v0.7.0 beta downloads or outdated links to older versions.

Oblivion's relatively low clone rate will be due to a combination of the community preference for BOSS and the natural decrease over time of the rate at which people start to mod Oblivion.

## Masterlist Content

Here are some stats on what is in the masterlists at time of writing. The LOOT stats were obtained by temporarily adding counters to the [Masterlist Search](https://loot.github.io/search) page (which uses GitHub APIs), and the BOSS plugin stats were obtained by counting via regex searches the instances of `^[^:\r\n]+$` and `MOD:` present in the masterlist files.

### LOOT

Masterlist         | Size (kb) | Lines  | Plugins | Sorting %
-------------------|-----------|--------|---------|----------
Oblivion           | 746       | 25,404 | 4,789   | 2.7
Skyrim             | 1,617     | 36,437 | 4,484   | 6.8
Fallout 3          | 137       | 4,730  | 913     | 2.3
Fallout: New Vegas | 121       | 4,419  | 913     | 6.8

### BOSS

Masterlist         | Size (kb) | Lines  | Plugins
-------------------|-----------|--------|--------
Oblivion           | 819       | 23,652 | 15,589
Skyrim             | 4,416     | 43,356 | 22,803
Fallout 3          | 154       | 5,742  | 3,457
Fallout: New Vegas | 189       | 5,711  | 3,754

The LOOT masterlists are considerably slimmer than the their BOSS counterparts, excluding Oblivion's line count. The percentage of plugin entries with sorting metadata (priority or load after) is low, and scaling the percentages to compare against all the plugins BOSS can sort gives values ranging from 0.36% to 1.34%. This is well within my expected target of 2%, so that's great to see.

While there will be plugins BOSS sorts better than LOOT, due to loss of implicit data during the initial conversion process, there will also be plugins that LOOT sorts better than BOSS, and their numbers are likely to be similar, so this simplistic comparison is probably reasonably accurate.

## Conclusion

Aside from satisfying my curiosity and massaging my ego, the data gathered do suggest some things that can be done to provide a better user experience and helps direct the available resources:

1. BOSS's download page should point Fallout 3, Fallout: New Vegas and Skyrim users unequivocally to use LOOT instead, while suggesting that Oblivion users may want to stay with BOSS.
2. Fallout 3 and Fallout: New Vegas should get separate support threads set up for them: the official forums may or may not be the most suitable places for these.
3. LOOT's Oblivion support should track BOSS's, so some thought should to be put into how best to do that: a combined LOOT and BOSS for Oblivion contribution thread may be best.
