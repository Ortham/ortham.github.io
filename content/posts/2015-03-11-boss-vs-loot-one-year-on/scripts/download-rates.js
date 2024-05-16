import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const data = [
    {label: "BOSS v2.2.0", value: 3788, name: 'boss'},
    {label: "LOOT v0.5.0", value: 1206, name: 'loot'},
    {label: "BOSS v2.3.0", value: 3363, name: 'boss'},
    {label: "LOOT v0.6.0", value:  1438, name: 'loot'},
    {label: "LOOT v0.6.1", value:  2566, name: 'loot'},
];

const container = document.getElementById('averageDailyDownloadsChart');
const containerWidth = container.offsetWidth;

const margin = {top: 20, right: 30, bottom: 30, left: 50};
const width = containerWidth - margin.left - margin.right;
const height = 250 - margin.top - margin.bottom;

const x = d3.scaleBand()
    .domain(data.map(d => d.label))
    .rangeRound([0, width])
    .padding(0.1);

const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)])
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
    .call(d3.axisLeft(y));

chart.append("g")
    .selectAll()
    .data(data)
    .join("rect")
    .attr("class", d => 'bar ' + d.name)
    .attr("x", d => x(d.label))
    .attr("y", d => y(d.value))
    .attr("height", d => height - y(d.value))
    .attr("width", x.bandwidth());

container.append(svg.node());
