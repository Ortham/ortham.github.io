import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const data = [
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

const container = document.getElementById('commitsChart');
const containerWidth = container.offsetWidth;

const margin = {top: 20, right: 30, bottom: 30, left: 60};
const width = containerWidth - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const x = d3.scaleBand()
    .domain(data.map(d => d.label))
    .rangeRound([0, width])
    .padding(0.1);

const y = d3.scalePow()
    .exponent(0.3)
    .domain([d3.min(data, d => d.value), d3.max(data, d => d.value)])
    .range([height, 0]);

const svg = d3.create("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

chart.append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

chart.append("g")
    .attr("class", "y axis")
    .call(d3.axisLeft(y)
        .tickValues([-450, 0, 500, 1000, 2000, 4000, 8000, 16000, 24500]));

const legend = chart.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${containerWidth - 250},${margin.top})`);

legend.append("rect")
    .attr("class", "bar positive loot")
    .attr("width", 150)
    .attr("height", 30)

legend.append("text")
    .attr("dy", "0.71em")
    .attr("x", 10)
    .attr("y", 10)
    .text("LOOT (2014-2015)")

legend.append("rect")
    .attr("class", "bar positive boss")
    .attr("width", 150)
    .attr("height", 30)
    .attr("y", 30)

legend.append("text")
    .attr("dy", "0.71em")
    .attr("x", 10)
    .attr("y", 40)
    .text("BOSS (2014-2015)")

legend.append("rect")
    .attr("class", "bar positive boss-previous")
    .attr("width", 150)
    .attr("height", 30)
    .attr("y", 60)

legend.append("text")
    .attr("dy", "0.71em")
    .attr("x", 10)
    .attr("y", 70)
    .text("BOSS (2013-2014)")

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
    return x(d.label) + i * x.bandwidth() / 3;
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

chart.append("g")
    .selectAll()
    .data(data)
    .join("rect")
    .attr("class", getClass)
    .attr("x", getXPos)
    .attr("y", d => y(Math.max(0, d.value)))
    .attr("height", d => Math.abs(y(d.value) - y(0)))
    .attr("width", x.bandwidth() / 3);

container.append(svg.node());
