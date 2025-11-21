import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

interface ChartProps {
  data: { month: string; value: number }[];
}

export function Chart({ data }: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const drawChart = () => {
      if (!chartRef.current) return;

      d3.select(chartRef.current).select('svg').remove();

      if (!data || data.length === 0) return;

      const element = chartRef.current;
      if (!element.offsetWidth || !element.offsetHeight) return;

      const margin = { top: 20, right: 30, bottom: 40, left: 60 };
      const width = element.offsetWidth - margin.left - margin.right;
      const height = element.offsetHeight - margin.top - margin.bottom;

      const svg = d3.select(element)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${element.offsetWidth} ${element.offsetHeight}`)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      
      const x = d3.scaleBand()
        .domain(data.map(d => d.month))
        .range([0, width])
        .padding(0.1);

      const yMin = d3.min(data, (d: any) => d.value) as number;
      const yMax = d3.max(data, (d: any) => d.value) as number;

      const y = d3.scaleLinear()
        .domain([Math.min(0, yMin), Math.max(0, yMax)])
        .range([height, 0])
        .nice();

      svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .style('fill', '#9ca3af');

      svg.append('g')
        .call(d3.axisLeft(y).tickFormat((d: any) => (d/1000) + 'k'))
        .selectAll('text')
        .style('fill', '#9ca3af');

      // Grid lines
      svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSize(-height).tickFormat(() => ''))
        .selectAll('line')
        .style('stroke', '#4b5563')
        .style('stroke-opacity', '0.3');

      svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ''))
        .selectAll('line')
        .style('stroke', '#4b5563')
        .style('stroke-opacity', '0.3');

      // Zero line
      svg.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', y(0))
        .attr('y2', y(0))
        .attr('stroke', '#a78bfa')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4');

      const line = d3.line()
        .x((d: any) => x(d.month) + x.bandwidth() / 2)
        .y((d: any) => y(d.value))
        .curve(d3.curveMonotoneX);

      svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#4ade80')
        .attr('stroke-width', 2.5)
        .attr('d', line);

      svg.selectAll('.dot')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('cx', (d: any) => x(d.month) + x.bandwidth() / 2)
        .attr('cy', (d: any) => y(d.value))
        .attr('r', 4)
        .attr('fill', (d: any) => d.value >= 0 ? '#4ade80' : '#f87171')
        .attr('stroke', '#1f2937')
        .attr('stroke-width', 2);
    };
    
    drawChart();

    const resizeObserver = new ResizeObserver(() => {
        drawChart();
    });

    if (chartRef.current) {
        resizeObserver.observe(chartRef.current);
    }

    return () => {
        if (chartRef.current) {
            resizeObserver.unobserve(chartRef.current);
        }
    };
  }, [data]);

  return <div ref={chartRef} style={{ width: '100%', height: '100%' }} />;
}