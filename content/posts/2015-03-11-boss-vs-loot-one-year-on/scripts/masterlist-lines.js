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

    var parentWidth = document.getElementById('commits').parentElement.offsetWidth;

    var margin = {top: 20, right: 30, bottom: 30, left: 60},
        width = parentWidth - margin.left - margin.right,
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

    d3.select('#commits-legend')
        .attr("transform", "translate(" + (parentWidth - 175) + "," + margin.top + ")");

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
