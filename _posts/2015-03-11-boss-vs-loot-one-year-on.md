---
layout: post
title:  "BOSS vs. LOOT In Numbers"
date:   2015-03-11
summary: "Analysing the stats, one year on."
---
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.5/d3.js" charset="utf-8"></script>
<style>
.bar {
  fill: steelblue;
}

.axis text {
  font: 0.6em sans-serif;
}

.axis path,
.axis line {
  fill: none;
  stroke: #000;
  shape-rendering: crispEdges;
}

.x.axis path {
  display: none;
}

.x.axis .tick line {
    opacity: 0;
}
.legend text {
    fill: white;
    font: 0.6em sans-serif;
    text-anchor:left;
}
.loot {
    opacity: 1;
}
.boss {
    opacity: 0.66;
}
.boss-previous {
    opacity: 0.33;
}

article > table {
    margin: 1rem;
}
article > table th, article > table td {
    padding: 10px;
}
article > table td:not(:first-child) {
    text-align: center;
}
</style>

LOOT's first release, v0.5.0, was made on the 31st of March, 2014. Almost one year on, I thought I'd take a look at some stats to see how it's performing against its predecessor, BOSS.

## Download Counts

The release download numbers can be obtained using GitHub's Releases API, eg.

<script src="https://gist.github.com/WrinklyNinja/62888dd1228b6631c5f0.js"></script>

#### Average Daily Download Rates

<svg id="averageDailyDownloads" class="chart"></svg>
<script>
(function(){
    var data = [
        {label: "BOSS v2.2.0", value: 3788, name: 'boss'},
        {label: "LOOT v0.5.0", value: 1206, name: 'loot'},
        {label: "BOSS v2.3.0", value: 3363, name: 'boss'},
        {label: "LOOT v0.6.0", value:  1438, name: 'loot'},
        {label: "LOOT v0.6.1", value:  2566, name: 'loot'},
    ];

    var margin = {top: 20, right: 30, bottom: 30, left: 50},
        width = 768 - margin.left - margin.right,
        height = 250 - margin.top - margin.bottom;

    var x = d3.scale.ordinal()
        .domain(data.map(function(d) { return d.label; }))
        .rangeRoundBands([0, width], .1);

    var y = d3.scale.linear()
        .domain([0, d3.max(data, function(d) { return d.value; })])
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var chart = d3.select("#averageDailyDownloads")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    chart.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    chart.append("g")
      .attr("class", "y axis")
      .call(yAxis);

    chart.selectAll(".bar")
      .data(data)
    .enter().append("rect")
      .attr("class", function(d) { return 'bar ' + d.name;})
      .attr("x", function(d) { return x(d.label); })
      .attr("y", function(d) { return y(d.value); })
      .attr("height", function(d) { return height - y(d.value); })
      .attr("width", x.rangeBand());
})();
</script>

These values are obtained by dividing total downloads by number of days since release. Actual download rates will decrease over time, but this merely a better representation of popularity than raw download numbers. The graph shows that BOSS's popularity is declining while LOOT's increases. I expect that LOOT's upcoming v0.7.0 release will outstrip BOSS for the first time.

## Contributions

Masterlist contributions are a useful metric because they give some insight into what people are interested in and value, given that contributing requires effort and is not particularly fun. I could have gotten the data using GitHub's [Statistics API](https://developer.github.com/v3/repos/statistics/), but I counted them manually using the graphs available for each repository ([example](https://github.com/loot/skyrim/graphs/contributors?from=2014-03-11&to=2015-03-11&type=c)).

#### LOOT Masterlists Line Difference

<svg id="commits" class="chart">
    <g class="legend" transform="translate(550, 20)">
        <rect class="bar positive loot" width="175" height="30"/>
        <text dy=".71em" x="10" y="10">LOOT (2014-2015)</text>
        <rect class="bar positive boss" width="175" height="30" y="30"/>
        <text dy=".71em" x="10" y="40">BOSS (2014-2015)</text>
        <rect class="bar positive boss-previous" width="175" height="30" y="60"/>
        <text dy=".71em" x="10" y="70" style="fill:black">BOSS (2013-2014)</text>
    </g>
</svg>
<script>
(function(){
    var data = [
        /* Oblivion */
        {label: "Oblivion", value: 95}, // BOSS (year before)
        {label: "Oblivion", value: 828}, // BOSS
        {label: "Oblivion", value: 182}, // LOOT
        /* Skyrim */
        {label: "Skyrim", value: 24977}, // BOSS (year before)
        {label: "Skyrim", value: 66}, // BOSS
        {label: "Skyrim", value: -445}, // LOOT
        /* Fallout 3 */
        {label: "Fallout 3", value: -2}, // BOSS (year before)
        {label: "Fallout 3", value: 0}, // BOSS
        {label: "Fallout 3", value: 1292}, // LOOT
        /* Fallout: New Vegas */
        {label: "Fallout: New Vegas", value: 217}, // BOSS (year before)
        {label: "Fallout: New Vegas", value: 108}, // BOSS
        {label: "Fallout: New Vegas", value: 787}, // LOOT
    ];

    var margin = {top: 20, right: 30, bottom: 30, left: 60},
        width = 768 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    var x = d3.scale.ordinal()
        .domain(data.map(function(d) { return d.label; }))
        .rangeRoundBands([0, width], .1);

    var y = d3.scale.pow().exponent(0.3)
        .domain([d3.min(data, function(d){ return d.value}), d3.max(data, function(d){ return d.value})])
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .tickValues([-450, 0, 500, 1000, 2000, 4000, 8000, 16000, 24500]);

    var chart = d3.select("#commits")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    chart.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    chart.append("g")
      .attr("class", "y axis")
      .call(yAxis);

      function getXPos(d, i) {
          if (i < 3) {
              i = i;
          } else if (i < 6) {
              i -= 3;
          } else if (i < 9) {
              i -= 6;
          } else if (i < 12) {
              i -= 9;
          }
          return x(d.label) + i * x.rangeBand() / 3;
      }

      function getClass(d, i) {
          if (i < 3) {
              i = i;
          } else if (i < 6) {
              i -= 3;
          } else if (i < 9) {
              i -= 6;
          } else if (i < 12) {
              i -= 9;
          }

          var name = 'bar';
          if (d.value < 0) {
              name += ' negative';
          } else {
              name += ' positive';
          }
          if (i == 2) {
              name += ' loot';
          } else if (i == 1) {
              name += ' boss';
          } else if (i == 0) {
              name += ' boss-previous';
          }
          return name;
      }

    chart.selectAll(".bar")
      .data(data)
    .enter().append("rect")
      .attr("class", getClass)
      .attr("x", getXPos)
      .attr("y", function(d) { return y(Math.max(0, d.value)); })
      .attr("height", function(d) { return Math.abs(y(d.value) - y(0)); })
      .attr("width", x.rangeBand() / 3);
})();
</script>

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

#### Average Daily Clone Rate

<svg id="averageDailyClones" class="chart"></svg>
<script>
(function(){
    var data = [
        {label: "Oblivion", value: 144},
        {label: "Skyrim", value: 2162},
        {label: "Fallout 3", value: 100},
        {label: "Fallout: New Vegas", value:  236},
    ];

    var margin = {top: 20, right: 30, bottom: 30, left: 50},
        width = 768 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;

    var x = d3.scale.ordinal()
        .domain(data.map(function(d) { return d.label; }))
        .rangeRoundBands([0, width], .1);

    var y = d3.scale.linear()
        .domain([0, d3.max(data, function(d) { return d.value; })])
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var chart = d3.select("#averageDailyClones")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    chart.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    chart.append("g")
      .attr("class", "y axis")
      .call(yAxis);

    chart.selectAll(".bar")
      .data(data)
    .enter().append("rect")
      .attr("class", 'bar loot')
      .attr("x", function(d) { return x(d.label); })
      .attr("y", function(d) { return y(d.value); })
      .attr("height", function(d) { return height - y(d.value); })
      .attr("width", x.rangeBand());
})();
</script>

The graph above shows that Skyrim is (predictably) the game LOOT is most used for. The total number of clones per day comes out as ~ 2642, which is just slightly more than the number of downloads per day for LOOT's v0.6.1 release: this makes sense, since the majority of recent downloads will be of the latest release. The difference may be due to v0.7.0 beta downloads or outdated links to older versions.

Oblivion's relatively low clone rate will be due to a combination of the community preference for BOSS and the natural decrease over time of the rate at which people start to mod Oblivion.

## Masterlist Content

Here are some stats on what is in the masterlists at time of writing. The LOOT stats were obtained by temporarily adding counters to the [Masterlist Search](http://loot.github.io/search) page (which uses GitHub APIs), and the BOSS plugin stats were obtained by counting via regex searches the instances of `^[^:\r\n]+$` and `MOD:` present in the masterlist files.

#### LOOT

Masterlist         | Size (kb) | Lines  | Plugins | Sorting %
-------------------|-----------|--------|---------|----------
Oblivion           | 746       | 25,404 | 4,789   | 2.7
Skyrim             | 1,617     | 36,437 | 4,484   | 6.8
Fallout 3          | 137       | 4,730  | 913     | 2.3
Fallout: New Vegas | 121       | 4,419  | 913     | 6.8

#### BOSS

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
