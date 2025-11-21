

import { Component, ChangeDetectionStrategy, ElementRef, inject, input, effect, AfterViewInit, OnDestroy, signal } from '@angular/core';

declare const d3: any;

@Component({
  selector: 'app-chart',
  standalone: true,
  template: ``,
  styles: [':host { display: block; width: 100%; height: 100%; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartComponent implements AfterViewInit, OnDestroy {
  data = input.required<{ month: string; value: number }[]>();
  
  private host = inject(ElementRef);
  private svg: any;
  private resizeObserver!: ResizeObserver;
  private isViewInitialized = signal(false);

  constructor() {
    effect(() => {
      // This effect runs when `data` or `isViewInitialized` changes.
      // We only draw if the view has been initialized.
      if (this.isViewInitialized()) {
        this.drawChart(this.data());
      }
    });
  }

  ngAfterViewInit(): void {
    this.setupResizeObserver();
    // Signal that the view is ready, which will trigger the effect to draw the initial chart.
    this.isViewInitialized.set(true);
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(entries => {
      if (entries[0].contentRect.width > 0) {
        this.drawChart(this.data());
      }
    });
    this.resizeObserver.observe(this.host.nativeElement);
  }

  private drawChart(data: { month: string; value: number }[]): void {
    d3.select(this.host.nativeElement).select('svg').remove();

    if (!data || data.length === 0) return;

    const element = this.host.nativeElement;
    if (!element.offsetWidth || !element.offsetHeight) return;

    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = element.offsetWidth - margin.left - margin.right;
    const height = element.offsetHeight - margin.top - margin.bottom;

    this.svg = d3.select(element)
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

    this.svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('fill', '#9ca3af');

    this.svg.append('g')
      .call(d3.axisLeft(y).tickFormat((d: any) => (d/1000) + 'k'))
      .selectAll('text')
      .style('fill', '#9ca3af');

    // Grid lines
    this.svg.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickSize(-height).tickFormat(() => ''))
      .selectAll('line')
      .style('stroke', '#4b5563')
      .style('stroke-opacity', '0.3');

    this.svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ''))
      .selectAll('line')
      .style('stroke', '#4b5563')
      .style('stroke-opacity', '0.3');

    // Zero line
    this.svg.append('line')
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

    this.svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#4ade80')
      .attr('stroke-width', 2.5)
      .attr('d', line);

    this.svg.selectAll('.dot')
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
  }
}
