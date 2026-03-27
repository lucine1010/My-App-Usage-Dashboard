const API_URL = "https://api.sheetbest.com/sheets/0540eac5-5616-47fe-8968-fd6d59a4cd2b";

const width = 480;
const height = 440;

// Tooltip
const tooltip = d3.select("#tooltip");

function showTooltip(event, html) {
  const offsetX = 16;
  const offsetY = 18;

  tooltip
    .html(html)
    .classed("visible", true);

  const tooltipNode = tooltip.node();
  const tooltipWidth = tooltipNode.offsetWidth;
  const tooltipHeight = tooltipNode.offsetHeight;

  let left = event.pageX + offsetX;
  let top = event.pageY - tooltipHeight - offsetY;

  if (left + tooltipWidth > window.innerWidth - 12) {
    left = event.pageX - tooltipWidth - 12;
  }

  if (top < 12) {
    top = event.pageY + 18;
  }

  tooltip
    .style("left", `${left}px`)
    .style("top", `${top}px`);
}

function moveTooltip(event) {
  const offsetX = 16;
  const offsetY = 18;

  const tooltipNode = tooltip.node();
  const tooltipWidth = tooltipNode.offsetWidth;
  const tooltipHeight = tooltipNode.offsetHeight;

  let left = event.pageX + offsetX;
  let top = event.pageY - tooltipHeight - offsetY;

  if (left + tooltipWidth > window.innerWidth - 12) {
    left = event.pageX - tooltipWidth - 12;
  }

  if (top < 12) {
    top = event.pageY + 18;
  }

  tooltip
    .style("left", `${left}px`)
    .style("top", `${top}px`);
}

function hideTooltip() {
  tooltip.classed("visible", false);
}

// Category mapping
function mapToSuperCategory(category) {
  const categoryLower = (category || "").toLowerCase();

  if (["social", "information", "news"].includes(categoryLower)) {
    return "Social & Info";
  } else if (["utility", "travel", "finance", "maps"].includes(categoryLower)) {
    return "Life & Utility";
  } else if (["entertainment", "music", "games", "video"].includes(categoryLower)) {
    return "Entertainment";
  } else if (["productivity", "study", "education"].includes(categoryLower)) {
    return "Work & Study";
  }
}

fetch(API_URL)
  .then((response) => response.json())
  .then((data) => {
    renderBubbleChart(data);
    renderScatterChart(data);
  })
  .catch((error) => {
    console.error("Error loading data:", error);
  });

function renderBubbleChart(data) {
  const grouped = d3.rollups(
    data,
    (v) => d3.sum(v, (d) => Number(d.minutes) || 0),
    (d) => d.app_name
  );

  let apps = grouped.map((d) => ({
    app: d[0].trim().toLowerCase(),
    appDisplay: d[0].trim(),
    minutes: d[1]
  }));

  apps = apps
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 8);

  const logoMap = {
    rednote: "svglogo/xhs.svg",
    wechat: "svglogo/wechat.svg",
    chatgpt: "svglogo/ChatGPT.svg",
    safari: "svglogo/safari.svg",
    instagram: "svglogo/instagram.svg",
    "qq music": "svglogo/qq.svg",
    "google maps": "svglogo/map.svg",
    "google map": "svglogo/map.svg",
    weibo: "svglogo/weibo.svg",
    bilibili: "svglogo/bilibili.svg"
  };

  const radiusScale = d3
    .scalePow()
    .exponent(0.55)
    .domain([0, d3.max(apps, (d) => d.minutes)])
    .range([14, 80]);

  apps.forEach((d) => {
    d.logo = logoMap[d.app] || null;
    d.radius = radiusScale(d.minutes);
    d.scale = 1;
  });

  d3.select("#bubble-chart").selectAll("*").remove();

  const bubbleSvg = d3
    .select("#bubble-chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const simulation = d3
    .forceSimulation(apps)
    .force("center", d3.forceCenter(width / 2, 190).strength(0.9))
    .force("x", d3.forceX(width / 2).strength(0.08))
    .force("y", d3.forceY(190).strength(0.08))
    .force("charge", d3.forceManyBody().strength(-20))
    .force(
      "collision",
      d3.forceCollide().radius((d) => d.radius + 22).iterations(4)
    )
    .alpha(1)
    .alphaDecay(0.025);

  for (let i = 0; i < 220; i++) {
    simulation.tick();
  }

  const bubbles = bubbleSvg
    .selectAll("g.bubble-group")
    .data(apps)
    .enter()
    .append("g")
    .attr("class", "bubble-group")
    .attr("transform", (d) => `translate(${d.x},${d.y}) scale(${d.scale})`)
    .style("opacity", 1);

  bubbles
    .append("circle")
    .attr("r", (d) => d.radius)
    .attr("fill", "#f2f2f2");

  bubbles
    .filter((d) => d.logo)
    .append("image")
    .attr("href", (d) => d.logo)
    .attr("x", (d) => -d.radius * 0.72)
    .attr("y", (d) => -d.radius * 0.72)
    .attr("width", (d) => d.radius * 1.44)
    .attr("height", (d) => d.radius * 1.44)
    .attr("preserveAspectRatio", "xMidYMid meet");

  bubbles
    .append("text")
    .attr("class", "bubble-label-name")
    .text((d) => d.appDisplay)
    .attr("x", 0)
    .attr("y", (d) => d.radius + 18)
    .style("pointer-events", "none");

  bubbles
    .filter((d, i) => i < 2)
    .append("text")
    .attr("class", "bubble-label-time")
    .text((d) => `${Math.round(d.minutes)}m`)
    .attr("x", 0)
    .attr("y", (d) => d.radius + 31)
    .style("pointer-events", "none");

  bubbles
    .style("cursor", "pointer")
    .on("mouseenter", function (event, d) {
      d.scale = 1.08;
      d3.select(this)
        .raise()
        .transition()
        .duration(180)
        .attr("transform", `translate(${d.x},${d.y}) scale(${d.scale})`);

      showTooltip(
        event,
        `<strong>${d.appDisplay}</strong><br>${Math.round(d.minutes)} minutes`
      );
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", function (event, d) {
      d.scale = 1;
      d3.select(this)
        .transition()
        .duration(180)
        .attr("transform", `translate(${d.x},${d.y}) scale(${d.scale})`);

      hideTooltip();
    });

  simulation.on("tick", () => {
    bubbles.attr(
      "transform",
      (d) => `translate(${d.x},${d.y}) scale(${d.scale || 1})`
    );
  });
}

function renderScatterChart(data) {
  const scatterGrouped = d3.rollups(
    data,
    (v) => ({
      minutes: d3.sum(v, (d) => Number(d.minutes) || 0),
      pickups: d3.sum(v, (d) => Number(d.pickups) || 0),
      category: v[0].category
    }),
    (d) => d.app_name
  );

  const scatterData = scatterGrouped
    .map((d) => ({
      app: d[0].trim(),
      minutes: d[1].minutes,
      pickups: d[1].pickups,
      category: mapToSuperCategory(d[1].category)
    }))
    .filter((d) => {
      const name = d.app.toLowerCase();
      return (
        name !== "rednote" &&
        name !== "wechat" &&
        (d.minutes > 35 || d.pickups > 10)
      );
    });

  d3.select("#scatter-chart").selectAll("*").remove();

  const legendContainer = d3.select("#scatter-legend");
  legendContainer.html("");

  const scatterWidth = 480;
  const scatterHeight = 440;
  const margin = { top: 55, right: 30, bottom: 75, left: 75 };

  const scatterSvg = d3
    .select("#scatter-chart")
    .append("svg")
    .attr("viewBox", `0 0 ${scatterWidth} ${scatterHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const maxPickups = d3.max(scatterData, (d) => d.pickups);
  const maxMinutes = d3.max(scatterData, (d) => d.minutes);

  const xScale = d3
    .scaleLinear()
    .domain([0, maxPickups * 1.08])
    .nice()
    .range([margin.left, scatterWidth - margin.right]);

  const yScale = d3
    .scaleLinear()
    .domain([0, maxMinutes * 1.12])
    .nice()
    .range([scatterHeight - margin.bottom, margin.top]);

  const categoryColor = d3
    .scaleOrdinal()
    .domain([
      "Social & Info",
      "Life & Utility",
      "Entertainment",
      "Work & Study",
      
    ])
    .range(["#FF6B6B", "#06C0B4", "#F5A623", "#4A90E2", ]);

  const xMedian = d3.median(scatterData, (d) => d.pickups);
  const yMedian = d3.median(scatterData, (d) => d.minutes);

  // subtle grid
  const gridGroup = scatterSvg.append("g").attr("class", "grid");

  gridGroup
    .selectAll("line.grid-line-h")
    .data(yScale.ticks(5))
    .enter()
    .append("line")
    .attr("x1", margin.left)
    .attr("x2", scatterWidth - margin.right)
    .attr("y1", (d) => yScale(d))
    .attr("y2", (d) => yScale(d))
    .style("stroke", "#eeeeee")
    .style("stroke-dasharray", "2,4")
    .style("stroke-width", 0.8);

  gridGroup
    .selectAll("line.grid-line-v")
    .data(xScale.ticks(5))
    .enter()
    .append("line")
    .attr("x1", (d) => xScale(d))
    .attr("x2", (d) => xScale(d))
    .attr("y1", margin.top)
    .attr("y2", scatterHeight - margin.bottom)
    .style("stroke", "#eeeeee")
    .style("stroke-dasharray", "2,4")
    .style("stroke-width", 0.8);

  // axes
  scatterSvg
    .append("g")
    .attr("transform", `translate(0,${scatterHeight - margin.bottom})`)
    .call(d3.axisBottom(xScale).ticks(5).tickSize(0))
    .style("font-size", "15px")
    .style("color", "#888");

  scatterSvg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale).ticks(5).tickSize(0))
    .style("font-size", "15px")
    .style("color", "#888");

  // remove axis domain lines
  scatterSvg.selectAll(".domain").style("stroke", "#999");

  // axis labels
  scatterSvg
    .append("text")
    .attr("class", "axis-title")
    .attr("x", margin.left + (scatterWidth - margin.left - margin.right) / 2)
    .attr("y", scatterHeight - 28)
    .attr("text-anchor", "middle")
    .style("fill", "#555")
    .style("font-weight", "500")
    .style("font-size", "18px")
    .text("Pickups");

  scatterSvg
    .append("text")
    .attr("class", "axis-title")
    .attr("transform", "rotate(-90)")
    .attr("x", -(scatterHeight / 2))
    .attr("y", 26)
    .attr("text-anchor", "middle")
    .style("fill", "#555")
    .style("font-weight", "500")
    .style("font-size", "18px")
    .text("Minutes");

  // median quadrant lines
  scatterSvg
    .append("line")
    .attr("x1", xScale(xMedian))
    .attr("x2", xScale(xMedian))
    .attr("y1", margin.top)
    .attr("y2", scatterHeight - margin.bottom)
    .style("stroke", "#bdbdbd")
    .style("stroke-dasharray", "5,5")
    .style("stroke-width", 1.2)
    .style("opacity", 0.9);

  scatterSvg
    .append("line")
    .attr("x1", margin.left)
    .attr("x2", scatterWidth - margin.right)
    .attr("y1", yScale(yMedian))
    .attr("y2", yScale(yMedian))
    .style("stroke", "#bdbdbd")
    .style("stroke-dasharray", "5,5")
    .style("stroke-width", 1.2)
    .style("opacity", 0.9);

  // quadrant labels
  scatterSvg
    .append("text")
    .attr("x", margin.left + 8)
    .attr("y", margin.top + 14)
    .attr("fill", "#999")
    .attr("font-size", "15px")
    .text("Longer sessions");

  scatterSvg
    .append("text")
    .attr("x", scatterWidth - margin.right - 105)
    .attr("y", margin.top + 14)
    .attr("fill", "#999")
    .attr("font-size", "15px")
    .text("Frequent + time-heavy");

  scatterSvg
    .append("text")
    .attr("x", margin.left + 8)
    .attr("y", scatterHeight - margin.bottom - 10)
    .attr("fill", "#999")
    .attr("font-size", "15px")
    .text("Light use");

  scatterSvg
    .append("text")
    .attr("x", scatterWidth - margin.right - 120)
    .attr("y", scatterHeight - margin.bottom - 10)
    .attr("fill", "#999")
    .attr("font-size", "15px")
    .text("Quick but frequent");

  // dots
  const dots = scatterSvg
    .selectAll("circle.scatter-dot")
    .data(scatterData)
    .enter()
    .append("circle")
    .attr("class", "scatter-dot")
    .attr("cx", (d) => xScale(d.pickups))
    .attr("cy", (d) => yScale(d.minutes))
    .attr("r", 6)
    .attr("fill", (d) => categoryColor(d.category))
    .attr("opacity", 0.9)
    .style("cursor", "pointer");

  dots
    .on("mouseenter", function (event, d) {
      d3.select(this)
        .raise()
        .transition()
        .duration(180)
        .attr("r", 9)
        .attr("opacity", 1);

      showTooltip(
        event,
        `<strong>${d.app}</strong><br>Minutes: ${Math.round(d.minutes)}<br>Pickups: ${Math.round(d.pickups)}<br>Category: ${d.category}`
      );
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", function () {
      d3.select(this)
        .transition()
        .duration(180)
        .attr("r", 6)
        .attr("opacity", 0.9);

      hideTooltip();
    });

  // choose more meaningful labels
  const labelApps = [];
  const byMinutes = [...scatterData].sort((a, b) => b.minutes - a.minutes).slice(0, 3);
  const byPickups = [...scatterData].sort((a, b) => b.pickups - a.pickups).slice(0, 3);

  [...byMinutes, ...byPickups].forEach((d) => {
    if (!labelApps.find((item) => item.app === d.app)) {
      labelApps.push(d);
    }
  });

  const labelNodes = labelApps.map((d, i) => ({
    id: i,
    app: d.app,
    x0: xScale(d.pickups),
    y0: yScale(d.minutes),
    x: xScale(d.pickups) + 10,
    y: yScale(d.minutes) - 10,
    radius: 26
  }));

  const labelSim = d3
    .forceSimulation(labelNodes)
    .force("x", d3.forceX((d) => d.x0 + 12).strength(0.8))
    .force("y", d3.forceY((d) => d.y0 - 12).strength(0.8))
    .force("collide", d3.forceCollide(24).iterations(4))
    .stop();

  for (let i = 0; i < 120; i++) {
    labelSim.tick();
  }

  scatterSvg
    .selectAll("line.label-leader")
    .data(labelNodes)
    .enter()
    .append("line")
    .attr("class", "label-leader")
    .attr("x1", (d) => d.x0)
    .attr("y1", (d) => d.y0)
    .attr("x2", (d) => d.x)
    .attr("y2", (d) => d.y)
    .style("stroke", "#d6d6d6")
    .style("stroke-width", 0.9);

  scatterSvg
    .selectAll("text.scatter-label")
    .data(labelNodes)
    .enter()
    .append("text")
    .attr("class", "scatter-label")
    .attr("x", (d) => d.x + 2)
    .attr("y", (d) => d.y)
    .style("font-size", "11px")
    .style("fill", "#444")
    .style("pointer-events", "none")
    .text((d) => d.app);

  // legend
  const legendData = categoryColor.domain();

  legendData.forEach((category) => {
    legendContainer
      .append("div")
      .attr("class", "legend-item")
      .html(
        `<div class="legend-color" style="background-color: ${categoryColor(category)}"></div><span>${category}</span>`
      );
  });
}