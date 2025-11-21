import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Chart } from './components/Chart';

export interface MonthlyResult {
  monthYear: string;
  newSubscriptions: number;
  newImplementations: number;
  cumulativeSubscriptions: number;
  recurringRevenue: number;
  implementationRevenue: number;
  totalGrossRevenue: number;
  taxes: number;
  netRevenue: number;
  commissionMonthly: number;
  commissionImplementation: number;
  totalCommissions: number;
  fixedCost: number;
  totalRemuneration: number;
  totalCosts: number;
  monthlyProfit: number;
  cumulativeProfit: number;
}

const ALL_MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export function App() {
  // --- Parâmetros de Entrada ---
  const [startMonth, setStartMonth] = useState('JUL');
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [monthlyCommissionRate, setMonthlyCommissionRate] = useState(5);
  const [implementationCommissionRate, setImplementationCommissionRate] = useState(10);
  const [taxRate, setTaxRate] = useState(6);
  const [avgMonthlyFee, setAvgMonthlyFee] = useState(335);
  const [avgImplementationFee, setAvgImplementationFee] = useState(1000);
  const [fixedEmployeeCost, setFixedEmployeeCost] = useState(2000);

  const [salesPlan, setSalesPlan] = useState<{ monthYear: string; newSubscriptions: number; newImplementations: number }[]>([]);

  useEffect(() => {
    const monthIndex = ALL_MONTHS.indexOf(startMonth);
    let currentYear = startYear;

    const newPlan = Array.from({ length: 12 }).map((_, i) => {
      const currentMonthIndex = (monthIndex + i) % 12;
      if (i > 0 && currentMonthIndex === 0) {
        currentYear++;
      }
      const month = ALL_MONTHS[currentMonthIndex];
      const yearStr = currentYear.toString().slice(-2);
      const monthYear = `${month}/${yearStr}`;

      const defaultSubs = i < 2 ? 0 : 1;
      const defaultImpls = i < 2 ? 0 : 1;

      return {
        monthYear,
        newSubscriptions: defaultSubs,
        newImplementations: defaultImpls,
      };
    });

    setSalesPlan(newPlan);
  }, [startMonth, startYear]);

  const simulationResults = useMemo(() => {
    let cumulativeSubscriptions = 0;
    let cumulativeProfit = 0;

    const monthlyData: MonthlyResult[] = salesPlan.map((plan) => {
      cumulativeSubscriptions += plan.newSubscriptions;

      const recurringRevenue = cumulativeSubscriptions * avgMonthlyFee;
      const implementationRevenue = plan.newImplementations * avgImplementationFee;
      const totalGrossRevenue = recurringRevenue + implementationRevenue;
      const taxes = totalGrossRevenue * (taxRate / 100);
      const netRevenue = totalGrossRevenue - taxes;
      
      const commissionMonthly = recurringRevenue * (1 - taxRate / 100) * (monthlyCommissionRate / 100);
      const commissionImplementation = implementationRevenue * (1 - taxRate / 100) * (implementationCommissionRate / 100);
      const totalCommissions = commissionMonthly + commissionImplementation;

      const fixedCost = fixedEmployeeCost;
      const totalRemuneration = fixedCost + totalCommissions;
      const totalCosts = fixedCost + totalCommissions + taxes;
      const monthlyProfit = totalGrossRevenue - totalCosts;
      cumulativeProfit += monthlyProfit;

      return {
        monthYear: plan.monthYear,
        newSubscriptions: plan.newSubscriptions,
        newImplementations: plan.newImplementations,
        cumulativeSubscriptions,
        recurringRevenue,
        implementationRevenue,
        totalGrossRevenue,
        taxes,
        netRevenue,
        commissionMonthly,
        commissionImplementation,
        totalCommissions,
        fixedCost,
        totalRemuneration,
        totalCosts,
        monthlyProfit,
        cumulativeProfit,
      };
    });

    const totals = {
        newSubscriptions: monthlyData.reduce((sum, d) => sum + d.newSubscriptions, 0),
        newImplementations: monthlyData.reduce((sum, d) => sum + d.newImplementations, 0),
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
  }, [salesPlan, avgMonthlyFee, avgImplementationFee, taxRate, monthlyCommissionRate, implementationCommissionRate, fixedEmployeeCost]);

  const chartData = useMemo(() => {
    return simulationResults.monthlyData.map(d => ({
      month: d.monthYear,
      value: d.cumulativeProfit
    }));
  }, [simulationResults]);

  const monthlyProfitChartData = useMemo(() => {
    return simulationResults.monthlyData.map(d => ({
      month: d.monthYear,
      value: d.monthlyProfit
    }));
  }, [simulationResults]);

  const onSalesChange = useCallback((monthYear: string, type: 'subs' | 'impls', event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, event.target.valueAsNumber || 0);
    setSalesPlan(currentPlan => 
      currentPlan.map(p => {
        if (p.monthYear === monthYear) {
          return {
            ...p,
            newSubscriptions: type === 'subs' ? value : p.newSubscriptions,
            newImplementations: type === 'impls' ? value : p.newImplementations
          };
        }
        return p;
      })
    );
  }, []);

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getProfitabilityMonth = (): string => {
    const monthlyData = simulationResults.monthlyData;

    const firstPermanentProfitIndex = monthlyData.findIndex((month, index) => {
      if (month.cumulativeProfit <= 0) {
        return false;
      }
      const subsequentMonths = monthlyData.slice(index + 1);
      const dipsBelowZero = subsequentMonths.some(subsequentMonth => subsequentMonth.cumulativeProfit < 0);
      return !dipsBelowZero;
    });

    if (firstPermanentProfitIndex !== -1) {
      const profitableMonth = monthlyData[firstPermanentProfitIndex];
      return `O funcionário se torna lucrativo de forma sustentável a partir de ${profitableMonth.monthYear}.`;
    }

    return 'O funcionário não atinge o ponto de equilíbrio sustentável no período de 12 meses.';
  };

  const results = simulationResults;

  return (
    <div className="min-h-screen container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white tracking-tight">Simulador de Contratação</h1>
        <p className="text-purple-300 mt-2 text-lg">Analise o ROI de um novo vendedor ao longo de 12 meses.</p>
      </header>

      <main className="space-y-8">
        {/* Painel de Parâmetros */}
        <section className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
          <h2 className="text-2xl font-semibold mb-6 text-white border-b border-gray-600 pb-3">Parâmetros Iniciais</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            
            <div className="flex flex-col">
              <label htmlFor="startMonth" className="mb-2 text-sm font-medium text-gray-300">Mês de Início</label>
              <select id="startMonth" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition">
                {ALL_MONTHS.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label htmlFor="startYear" className="mb-2 text-sm font-medium text-gray-300">Ano de Início</label>
              <input id="startYear" type="number" value={startYear} onChange={(e) => setStartYear(parseInt(e.target.value, 10) || new Date().getFullYear())} className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition" />
            </div>

            <div className="flex flex-col">
              <label htmlFor="avgMonthlyFee" className="mb-2 text-sm font-medium text-gray-300">Valor Médio - Mensalidade (R$)</label>
              <input id="avgMonthlyFee" type="number" value={avgMonthlyFee} onChange={(e) => setAvgMonthlyFee(Math.max(0, e.target.valueAsNumber || 0))} className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition" />
            </div>

            <div className="flex flex-col">
              <label htmlFor="avgImplementationFee" className="mb-2 text-sm font-medium text-gray-300">Valor Médio - Implantação (R$)</label>
              <input id="avgImplementationFee" type="number" value={avgImplementationFee} onChange={(e) => setAvgImplementationFee(Math.max(0, e.target.valueAsNumber || 0))} className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition" />
            </div>

            <div className="flex flex-col">
              <label htmlFor="monthlyCommissionRate" className="mb-2 text-sm font-medium text-gray-300">Comissão Mensalidade (%)</label>
              <input id="monthlyCommissionRate" type="number" value={monthlyCommissionRate} onChange={(e) => setMonthlyCommissionRate(Math.max(0, e.target.valueAsNumber || 0))} className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition" />
            </div>

            <div className="flex flex-col">
              <label htmlFor="implementationCommissionRate" className="mb-2 text-sm font-medium text-gray-300">Comissão Implantação (%)</label>
              <input id="implementationCommissionRate" type="number" value={implementationCommissionRate} onChange={(e) => setImplementationCommissionRate(Math.max(0, e.target.valueAsNumber || 0))} className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition" />
            </div>

            <div className="flex flex-col">
              <label htmlFor="taxRate" className="mb-2 text-sm font-medium text-gray-300">Impostos (%)</label>
              <input id="taxRate" type="number" value={taxRate} onChange={(e) => setTaxRate(Math.max(0, e.target.valueAsNumber || 0))} className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition" />
            </div>

            <div className="flex flex-col">
              <label htmlFor="fixedEmployeeCost" className="mb-2 text-sm font-medium text-gray-300">Custo Fixo Vendedor (R$)</label>
              <input id="fixedEmployeeCost" type="number" value={fixedEmployeeCost} onChange={(e) => setFixedEmployeeCost(Math.max(0, e.target.valueAsNumber || 0))} className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition" />
            </div>
          </div>
        </section>

        {/* Resultados: Tabela e Gráfico */}
        <section className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-semibold text-white">Resultados da Simulação</h2>
            <p className="text-purple-300 mt-1">{getProfitabilityMonth()}</p>
          </div>
          
          {/* Tabela de Resultados */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs text-purple-200 uppercase bg-gray-700/50">
                <tr>
                  <th scope="col" className="px-4 py-3 sticky left-0 bg-gray-700/80 backdrop-blur-sm">Mês/Ano</th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">Vendas Mensal. (Qtd)</th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">Vendas Impl. (Qtd)</th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">Receita Bruta</th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">Impostos</th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">Remuneração Vendedor</th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">Custos Totais</th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">Resultado Mensal</th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap font-bold">Caixa Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {results.monthlyData.map(item => (
                  <tr key={item.monthYear} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors duration-200">
                    <th scope="row" className="px-4 py-3 font-medium text-white sticky left-0 bg-gray-800/80 backdrop-blur-sm">{item.monthYear}</th>
                    <td className="px-4 py-2">
                      <input type="number" value={item.newSubscriptions} onChange={(e) => onSalesChange(item.monthYear, 'subs', e)} className="w-20 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white text-center focus:ring-1 focus:ring-purple-500 focus:border-purple-500" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" value={item.newImplementations} onChange={(e) => onSalesChange(item.monthYear, 'impls', e)} className="w-20 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white text-center focus:ring-1 focus:ring-purple-500 focus:border-purple-500" />
                    </td>
                    <td className="px-4 py-3">{formatCurrency(item.totalGrossRevenue)}</td>
                    <td className="px-4 py-3">{formatCurrency(item.taxes)}</td>
                    <td className="px-4 py-3">{formatCurrency(item.totalRemuneration)}</td>
                    <td className="px-4 py-3">{formatCurrency(item.totalCosts)}</td>
                    <td className={`px-4 py-3 ${item.monthlyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(item.monthlyProfit)}</td>
                    <td className={`px-4 py-3 font-bold ${item.cumulativeProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(item.cumulativeProfit)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="text-sm font-bold text-white bg-gray-700/50">
                <tr>
                    <td className="px-4 py-3 sticky left-0 bg-gray-700/80 backdrop-blur-sm">TOTAL</td>
                    <td className="px-4 py-3 text-center">{results.totals.newSubscriptions}</td>
                    <td className="px-4 py-3 text-center">{results.totals.newImplementations}</td>
                    <td className="px-4 py-3">{formatCurrency(results.totals.totalGrossRevenue)}</td>
                    <td className="px-4 py-3">{formatCurrency(results.totals.taxes)}</td>
                    <td className="px-4 py-3">{formatCurrency(results.totals.totalRemuneration)}</td>
                    <td className="px-4 py-3">{formatCurrency(results.totals.totalCosts)}</td>
                    <td className={`px-4 py-3 ${results.totals.finalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(results.totals.finalProfit)}</td>
                    <td className={`px-4 py-3 ${results.totals.finalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(results.totals.finalProfit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 border-t border-gray-700 mt-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Evolução do Caixa Acumulado</h3>
              <div className="h-96">
                  <Chart data={chartData}></Chart>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Evolução do Resultado Mensal</h3>
              <div className="h-96">
                  <Chart data={monthlyProfitChartData}></Chart>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}