// To satisfy the TypeScript compiler in an environment that expects a .tsx file,
// we declare the global variables that are loaded from CDNs in index.html.
declare const d3: any;
declare const $: any;

$(document).ready(function () {
  // --- CONSTANTS ---
  const ALL_MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  // --- STATE OBJECT ---
  let state = {
    startMonth: 'JUL',
    startYear: new Date().getFullYear(),
    monthlyCommissionRate: 5,
    implementationCommissionRate: 10,
    taxRate: 6,
    avgMonthlyFee: 335,
    avgImplementationFee: 1000,
    fixedEmployeeCost: 2000,
    salesPlan: [] as { monthYear: string; newSubscriptions: number; newImplementations: number }[],
  };

  // --- HELPER FUNCTIONS ---
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  // --- TOOLTIP SETUP ---
  function setupTooltip() {
      d3.select('body').append('div')
        .attr('id', 'chart-tooltip')
        .style('position', 'absolute')
        .style('opacity', 0)
        .style('background', '#1f2937')
        .style('border', '1px solid #4b5563')
        .style('border-radius', '8px')
        .style('padding', '8px 12px')
        .style('color', 'white')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('transition', 'opacity 0.2s');
  }

  // --- CHART RENDERING ---
  const chartInstances: { [key: string]: any } = {};
  function drawChart(containerSelector: string, data: { month: string; value: number }[]) {
    const container = $(containerSelector);
    if (!container.length) return;

    // Use a resize observer to redraw the chart when the container size changes
    if (!chartInstances[containerSelector]) {
      const resizeObserver = new ResizeObserver(() => {
        drawChart(containerSelector, state.salesPlan.length > 0 ? (containerSelector.includes('cumulative') ? getCumulativeProfitChartData() : getMonthlyProfitChartData()) : []);
      });
      resizeObserver.observe(container[0]);
      chartInstances[containerSelector] = resizeObserver;
    }

    container.empty();
    if (!data || data.length === 0) return;

    const tooltip = d3.select('#chart-tooltip');
    const element = container[0];
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

    svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x)).selectAll('text').style('fill', '#9ca3af');
    svg.append('g').call(d3.axisLeft(y).tickFormat((d: any) => (d/1000) + 'k')).selectAll('text').style('fill', '#9ca3af');
    svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).tickSize(-height).tickFormat(() => '')).selectAll('line').style('stroke', '#4b5563').style('stroke-opacity', '0.3');
    svg.append('g').attr('class', 'grid').call(d3.axisLeft(y).tickSize(-width).tickFormat(() => '')).selectAll('line').style('stroke', '#4b5563').style('stroke-opacity', '0.3');
    svg.append('line').attr('x1', 0).attr('x2', width).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', '#a78bfa').attr('stroke-width', 1.5).attr('stroke-dasharray', '4');

    const line = d3.line().x((d: any) => x(d.month)! + x.bandwidth() / 2).y((d: any) => y(d.value)).curve(d3.curveMonotoneX);
    svg.append('path').datum(data).attr('fill', 'none').attr('stroke', '#4ade80').attr('stroke-width', 2.5).attr('d', line);
    
    svg.selectAll('.dot')
       .data(data).enter()
       .append('circle')
       .attr('class', 'dot')
       .attr('cx', (d: any) => x(d.month)! + x.bandwidth() / 2).attr('cy', (d: any) => y(d.value))
       .attr('r', 5)
       .attr('fill', (d: any) => d.value >= 0 ? '#4ade80' : '#f87171')
       .attr('stroke', '#1f2937')
       .attr('stroke-width', 2)
       .style('cursor', 'pointer')
       .on('mouseover', function(event: MouseEvent, d: any) {
            tooltip.transition().duration(200).style('opacity', .9);
            tooltip.html(`<strong>${d.month}</strong><br/>${formatCurrency(d.value)}`)
                .style('left', (event.pageX + 15) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
       .on('mousemove', function(event: MouseEvent) {
            tooltip.style('left', (event.pageX + 15) + 'px')
                   .style('top', (event.pageY - 28) + 'px');
        })
       .on('mouseout', function() {
            tooltip.transition().duration(500).style('opacity', 0);
        });
  }

  // --- SIMULATION LOGIC ---
  function calculateSimulation() {
    let cumulativeSubscriptions = 0;
    let cumulativeProfit = 0;

    const monthlyData = state.salesPlan.map((plan) => {
      cumulativeSubscriptions += plan.newSubscriptions;

      const recurringRevenue = cumulativeSubscriptions * state.avgMonthlyFee;
      const implementationRevenue = plan.newImplementations * state.avgImplementationFee;
      const totalGrossRevenue = recurringRevenue + implementationRevenue;
      const taxes = totalGrossRevenue * (state.taxRate / 100);
      const netRevenue = totalGrossRevenue - taxes;
      
      const commissionMonthly = recurringRevenue * (1 - state.taxRate / 100) * (state.monthlyCommissionRate / 100);
      const commissionImplementation = implementationRevenue * (1 - state.taxRate / 100) * (state.implementationCommissionRate / 100);
      const totalCommissions = commissionMonthly + commissionImplementation;

      const fixedCost = state.fixedEmployeeCost;
      const totalRemuneration = fixedCost + totalCommissions;
      const totalCosts = fixedCost + totalCommissions + taxes;
      const monthlyProfit = totalGrossRevenue - totalCosts;
      cumulativeProfit += monthlyProfit;

      return { ...plan, cumulativeSubscriptions, recurringRevenue, implementationRevenue, totalGrossRevenue, taxes, netRevenue, commissionMonthly, commissionImplementation, totalCommissions, fixedCost, totalRemuneration, totalCosts, monthlyProfit, cumulativeProfit };
    });

    const totals = {
        newSubscriptions: monthlyData.reduce((sum, d) => sum + d.newSubscriptions, 0),
        newImplementations: monthlyData.reduce((sum, d) => sum + d.newImplementations, 0),
        recurringRevenue: monthlyData.reduce((sum, d) => sum + d.recurringRevenue, 0),
        totalGrossRevenue: monthlyData.reduce((sum, d) => sum + d.totalGrossRevenue, 0),
        taxes: monthlyData.reduce((sum, d) => sum + d.taxes, 0),
        netRevenue: monthlyData.reduce((sum, d) => sum + d.netRevenue, 0),
        totalCommissions: monthlyData.reduce((sum, d) => sum + d.totalCommissions, 0),
        totalRemuneration: monthlyData.reduce((sum, d) => sum + d.totalRemuneration, 0),
        fixedCost: monthlyData.reduce((sum, d) => sum + d.fixedCost, 0),
        totalCosts: monthlyData.reduce((sum, d) => sum + d.totalCosts, 0),
        finalProfit: monthlyData.length > 0 ? monthlyData[monthlyData.length-1].cumulativeProfit : 0,
    };

    return { monthlyData, totals };
  }
  
  function getProfitabilityMonth(monthlyData: any[]): string {
    const firstPermanentProfitIndex = monthlyData.findIndex((month, index) => {
      if (month.cumulativeProfit <= 0) return false;
      const subsequentMonths = monthlyData.slice(index + 1);
      return !subsequentMonths.some(subsequentMonth => subsequentMonth.cumulativeProfit < 0);
    });

    const minCumulativeProfit = monthlyData.length > 0 ? Math.min(0, ...monthlyData.map(d => d.cumulativeProfit)) : 0;
    const investmentNeededMessage = ` E a empresa vai precisar ter de caixa neste período o valor de: ${formatCurrency(minCumulativeProfit)}`;

    if (firstPermanentProfitIndex !== -1) {
      return `O funcionário se torna lucrativo de forma sustentável a partir de ${monthlyData[firstPermanentProfitIndex].monthYear}.${investmentNeededMessage}.`;
    }
    return `O funcionário não atinge o ponto de equilíbrio sustentável no período de 12 meses.${investmentNeededMessage}.`;
  }
  
  const getCumulativeProfitChartData = () => calculateSimulation().monthlyData.map(d => ({ month: d.monthYear, value: d.cumulativeProfit }));
  const getMonthlyProfitChartData = () => calculateSimulation().monthlyData.map(d => ({ month: d.monthYear, value: d.monthlyProfit }));

  // --- RENDER FUNCTION ---
  function render() {
    const { monthlyData, totals } = calculateSimulation();
    const tableBody = $('#results-table-body');
    const tableFooter = $('#results-table-footer');
    tableBody.empty();
    tableFooter.empty();

    // Render table rows
    monthlyData.forEach(item => {
      const profitColor = (value: number) => value >= 0 ? 'text-green-400' : 'text-red-400';
      const row = `
        <tr class="border-b border-gray-700 hover:bg-gray-700/30 transition-colors duration-200">
          <th scope="row" class="px-4 py-3 font-medium text-white sticky left-0 bg-gray-800/80 backdrop-blur-sm">${item.monthYear}</th>
          <td class="px-4 py-2">
            <input type="number" data-monthyear="${item.monthYear}" data-type="subs" value="${item.newSubscriptions}" class="w-20 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white text-center focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sales-input" />
          </td>
          <td class="px-4 py-2">
            <input type="number" data-monthyear="${item.monthYear}" data-type="impls" value="${item.newImplementations}" class="w-20 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white text-center focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sales-input" />
          </td>
          <td class="px-4 py-3">${formatCurrency(item.recurringRevenue)}</td>
          <td class="px-4 py-3">${formatCurrency(item.totalGrossRevenue)}</td>
          <td class="px-4 py-3">${formatCurrency(item.taxes)}</td>
          <td class="px-4 py-3">${formatCurrency(item.totalRemuneration)}</td>
          <td class="px-4 py-3">${formatCurrency(item.totalCosts)}</td>
          <td class="px-4 py-3 ${profitColor(item.monthlyProfit)}">${formatCurrency(item.monthlyProfit)}</td>
          <td class="px-4 py-3 font-bold ${profitColor(item.cumulativeProfit)}">${formatCurrency(item.cumulativeProfit)}</td>
        </tr>
      `;
      tableBody.append(row);
    });
    
    // Render table footer
    const profitColor = (value: number) => value >= 0 ? 'text-green-400' : 'text-red-400';
    const footerContent = `
        <td class="px-4 py-3 sticky left-0 bg-gray-700/80 backdrop-blur-sm">TOTAL</td>
        <td class="px-4 py-3 text-center">${totals.newSubscriptions}</td>
        <td class="px-4 py-3 text-center">${totals.newImplementations}</td>
        <td class="px-4 py-3">${formatCurrency(totals.recurringRevenue)}</td>
        <td class="px-4 py-3">${formatCurrency(totals.totalGrossRevenue)}</td>
        <td class="px-4 py-3">${formatCurrency(totals.taxes)}</td>
        <td class="px-4 py-3">${formatCurrency(totals.totalRemuneration)}</td>
        <td class="px-4 py-3">${formatCurrency(totals.totalCosts)}</td>
        <td class="px-4 py-3 ${profitColor(totals.finalProfit)}">${formatCurrency(totals.finalProfit)}</td>
        <td class="px-4 py-3 ${profitColor(totals.finalProfit)}">${formatCurrency(totals.finalProfit)}</td>
    `;
    tableFooter.append(footerContent);

    // Update summary text
    $('#profitability-month').text(getProfitabilityMonth(monthlyData));
    
    // Update charts
    drawChart('#cumulative-profit-chart', getCumulativeProfitChartData());
    drawChart('#monthly-profit-chart', getMonthlyProfitChartData());
  }
  
  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Listen for changes on all parameter inputs
    const inputs = 'input[type="number"], select';
    $(document).on('input change', inputs, function() {
      updateStateFromInputs();
      generateSalesPlan();
      render();
    });
    
    // Use event delegation for dynamically created sales plan inputs
    $('#results-table-body').on('input change', '.sales-input', function() {
        const el = $(this);
        const monthYear = el.data('monthyear');
        const type = el.data('type');
        const value = Math.max(0, parseInt(el.val() as string, 10) || 0);

        const planEntry = state.salesPlan.find(p => p.monthYear === monthYear);
        if (planEntry) {
            if (type === 'subs') {
                planEntry.newSubscriptions = value;
            } else {
                planEntry.newImplementations = value;
            }
        }
        render();
    });
  }

  // --- INITIALIZATION LOGIC ---
  function updateStateFromInputs() {
    state.startMonth = $('#startMonth').val() as string;
    state.startYear = parseInt($('#startYear').val() as string, 10) || new Date().getFullYear();
    state.monthlyCommissionRate = parseFloat($('#monthlyCommissionRate').val() as string) || 0;
    state.implementationCommissionRate = parseFloat($('#implementationCommissionRate').val() as string) || 0;
    state.taxRate = parseFloat($('#taxRate').val() as string) || 0;
    state.avgMonthlyFee = parseFloat($('#avgMonthlyFee').val() as string) || 0;
    state.avgImplementationFee = parseFloat($('#avgImplementationFee').val() as string) || 0;
    state.fixedEmployeeCost = parseFloat($('#fixedEmployeeCost').val() as string) || 0;
  }

  function generateSalesPlan() {
    const monthIndex = ALL_MONTHS.indexOf(state.startMonth);
    let currentYear = state.startYear;
    
    state.salesPlan = Array.from({ length: 12 }).map((_, i) => {
        const currentMonthIndex = (monthIndex + i) % 12;
        if (i > 0 && currentMonthIndex === 0) {
            currentYear++;
        }
        const month = ALL_MONTHS[currentMonthIndex];
        const monthYear = `${month}/${currentYear.toString().slice(-2)}`;
        
        // Preserve existing values if possible, otherwise set defaults
        const existingPlan = state.salesPlan.find(p => p.monthYear === monthYear);
        if (existingPlan) return existingPlan;

        return {
            monthYear,
            newSubscriptions: i < 2 ? 0 : 1,
            newImplementations: i < 2 ? 0 : 1,
        };
    });
  }

  function init() {
    setupTooltip();

    // Set initial month and year to current date
    const now = new Date();
    const currentMonth = ALL_MONTHS[now.getMonth()];
    const currentYear = now.getFullYear();
    $('#startMonth').val(currentMonth);
    $('#startYear').val(currentYear);
    
    // Continue with the rest of the initialization
    updateStateFromInputs();
    generateSalesPlan();
    setupEventListeners();
    render();
  }

  init();
});

// AI Studio always uses an `index.tsx` file for all project types.