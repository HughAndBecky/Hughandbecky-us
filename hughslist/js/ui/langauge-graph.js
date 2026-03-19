export function initLanguageGraph() {
  const svg = d3.select("#language-graph");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 40, right: 40, bottom: 40, left: 80 };

  const subjectZones = ["phonetics", "phonology", "morphology", "syntax", "discourse"];
  const tooltip = d3.select("#graph-tooltip");
  const parseDate = d3.timeParse("%Y-%m-%d");

  // Load XML from template
  const xmlText = document.getElementById("language-graph-xml").innerHTML.trim();
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "application/xml");

  const records = Array.from(xml.getElementsByTagName("*"))
    .filter(e => e.localName === "record");

  const data = records.map(parseRecord).filter(d => d && d.subjectZone);
  const idMap = new Map(data.map(d => [d.id, d]));

  const edges = [];
  data.forEach(d => {
    d.references.forEach(refId => {
      if (idMap.has(refId)) edges.push({ source: d.id, target: refId });
    });
    d.isReferencedBy.forEach(refById => {
      if (idMap.has(refById)) edges.push({ source: refById, target: d.id });
    });
  });

  drawGraph(data, edges);

  function parseRecord(rec) {
    const idEl = find(rec, "identifier");
    if (!idEl) return null;
    const id = idEl.textContent.trim();

    const titleEl = find(rec, "title");
    const title = titleEl ? titleEl.textContent.trim() : id;

    const dateEl = find(rec, "date");
    if (!dateEl) return null;
    const date = parseDate(dateEl.textContent.trim());
    if (!date) return null;

    const subjEls = findAll(rec, "subject");
    let subjectZone = null;
    for (const s of subjEls) {
      const text = s.textContent.trim().toLowerCase();
      if (subjectZones.includes(text)) {
        subjectZone = text;
        break;
      }
    }
    if (!subjectZone) return null;

    const refs = findAll(rec, "references").map(e => e.textContent.trim());
    const refBy = findAll(rec, "isReferencedBy").map(e => e.textContent.trim());
    const contributors = findAll(rec, "contributor").map(e => e.textContent.trim());

    return { id, title, date, subjectZone, references: refs, isReferencedBy: refBy, contributors };
  }

  function find(node, local) {
    return Array.from(node.getElementsByTagName("*")).find(e => e.localName === local);
  }

  function findAll(node, local) {
    return Array.from(node.getElementsByTagName("*")).filter(e => e.localName === local);
  }

  function drawGraph(nodes, edges) {
    const xScale = d3.scaleBand()
      .domain(subjectZones)
      .range([margin.left, width - margin.right])
      .padding(0.3);

    const dates = nodes.map(d => d.date);
    const yScale = d3.scaleTime()
      .domain(d3.extent(dates))
      .range([height - margin.bottom, margin.top]);

    nodes.forEach(d => {
      d.x = xScale(d.subjectZone) + xScale.bandwidth() / 2;
      d.y = yScale(d.date);
    });

    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "rgba(0,0,0,0.75)");

    const idToNode = new Map(nodes.map(d => [d.id, d]));

    svg.append("g")
      .selectAll("path")
      .data(edges)
      .join("path")
      .attr("class", "edge")
      .attr("d", (d, i) => {
        const s = idToNode.get(d.source);
        const t = idToNode.get(d.target);

        const mx = (s.x + t.x) / 2;
        const my = (s.y + t.y) / 2;

        const hJitter = ((i % 7) - 3) * 18;
        const vJitter = ((i % 5) - 2) * 22;

        const cx = mx + hJitter;
        const cy = my + vJitter;

        return `M ${s.x},${s.y} Q ${cx},${cy} ${t.x},${t.y}`;
      })
      .attr("stroke", "rgba(0,0,0,0.45)")
      .attr("stroke-width", 4)
      .attr("fill", "none")
      .attr("marker-end", "url(#arrow)");

    const nodeG = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    nodeG.append("circle")
      .attr("r", 6)
      .attr("fill", d => colorForSubject(d.subjectZone))
      .on("mouseover", (event, d) => {
        tooltip.style("display", "block")
          .style("left", (event.pageX + 8) + "px")
          .style("top", (event.pageY + 8) + "px")
          .html(`
            <strong>${d.title}</strong><br>
            ${d.id}<br>
            Date: ${d3.timeFormat("%Y-%m-%d")(d.date)}<br>
            Subject: ${d.subjectZone}<br>
            Contributors: ${d.contributors.join(", ") || "—"}
          `);
      })
      .on("mouseout", () => tooltip.style("display", "none"));

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .attr("class", "axis")
      .call(d3.axisBottom(xScale));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .attr("class", "axis")
      .call(d3.axisLeft(yScale));
  }

  function colorForSubject(s) {
    const colors = {
      phonetics: "#1f77b4",
      phonology: "#ff7f0e",
      morphology: "#2ca02c",
      syntax: "#d62728",
      discourse: "#9467bd"
    };
    return colors[s] || "#999";
  }
}
