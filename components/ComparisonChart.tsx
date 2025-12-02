import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { PlanetData } from '../types';

interface ComparisonChartProps {
  planet: PlanetData;
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({ planet }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const earthGravity = 9.8;
    const data = [
      { name: 'Earth', value: earthGravity, color: '#3b82f6' },
      { name: planet.name, value: planet.details.gravity, color: planet.color }
    ];

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 250 - margin.left - margin.right;
    const height = 150 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    const g = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .range([0, width])
      .padding(0.4)
      .domain(data.map(d => d.name));

    const y = d3.scaleLinear()
      .range([height, 0])
      .domain([0, Math.max(earthGravity, planet.details.gravity) * 1.2]);

    // X Axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("fill", "#9ca3af")
      .style("font-size", "10px");

    g.select(".domain").attr("stroke", "#4b5563");
    g.selectAll("line").attr("stroke", "#4b5563");

    // Y Axis
    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .selectAll("text")
      .attr("fill", "#9ca3af")
      .style("font-size", "10px");
      
    g.select(".domain").attr("stroke", "#4b5563");
    g.selectAll("line").attr("stroke", "#4b5563");

    // Bars
    g.selectAll(".bar")
      .data(data)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.name) || 0)
      .attr("y", height) // Start at bottom for animation
      .attr("width", x.bandwidth())
      .attr("height", 0) // Start height 0
      .attr("fill", d => d.color)
      .transition()
      .duration(750)
      .attr("y", d => y(d.value))
      .attr("height", d => height - y(d.value));

    // Title
    svg.append("text")
      .attr("x", (width + margin.left + margin.right) / 2)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#e5e7eb")
      .text("Gravity Comparison (m/s²)");

  }, [planet]);

  return (
    <div className="mt-4 p-2 bg-gray-900/50 rounded-lg border border-gray-700">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default ComparisonChart;
