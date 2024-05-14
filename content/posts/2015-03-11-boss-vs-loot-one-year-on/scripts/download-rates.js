(function(){
    var data = [
        {label: "BOSS v2.2.0", value: 3788, name: 'boss'},
        {label: "LOOT v0.5.0", value: 1206, name: 'loot'},
        {label: "BOSS v2.3.0", value: 3363, name: 'boss'},
        {label: "LOOT v0.6.0", value:  1438, name: 'loot'},
        {label: "LOOT v0.6.1", value:  2566, name: 'loot'},
    ];

    var parentWidth = document.getElementById('averageDailyDownloads').parentElement.offsetWidth;

    var margin = {top: 20, right: 30, bottom: 30, left: 50},
        width = parentWidth - margin.left - margin.right,
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
