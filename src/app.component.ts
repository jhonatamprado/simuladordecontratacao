import { Component, ChangeDetectionStrategy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartComponent } from './components/chart.component';

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

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ChartComponent],
})
export class AppComponent {
  readonly ALL_MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  // --- Parâmetros de Entrada ---
  startMonth = signal('JUL');
  startYear = signal(new Date().getFullYear());
  monthlyCommissionRate = signal(5);
  implementationCommissionRate = signal(10);
  taxRate = signal(6);
  avgMonthlyFee = signal(335);
  avgImplementationFee = signal(1000);
  fixedEmployeeCost = signal(2000);

  salesPlan = signal<{ monthYear: string; newSubscriptions: number; newImplementations: number }[]>([]);

  constructor() {
    effect(() => {
      const startM = this.startMonth();
      const startY = this.startYear();
      const monthIndex = this.ALL_MONTHS.indexOf(startM);
      let currentYear = startY;

      const newPlan = Array.from({ length: 12 }).map((_, i) => {
        const currentMonthIndex = (monthIndex + i) % 12;
        if (i > 0 && currentMonthIndex === 0) {
          currentYear++;
        }
        const month = this.ALL_MONTHS[currentMonthIndex];
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

      this.salesPlan.set(newPlan);
    }, { allowSignalWrites: true });
  }
  
  simulationResults = computed(() => {
    let cumulativeSubscriptions = 0;
    let cumulativeProfit = 0;

    const monthlyData: MonthlyResult[] = this.salesPlan().map((plan) => {
      cumulativeSubscriptions += plan.newSubscriptions;

      const recurringRevenue = cumulativeSubscriptions * this.avgMonthlyFee();
      const implementationRevenue = plan.newImplementations * this.avgImplementationFee();
      const totalGrossRevenue = recurringRevenue + implementationRevenue;
      const taxes = totalGrossRevenue * (this.taxRate() / 100);
      const netRevenue = totalGrossRevenue - taxes;
      
      const commissionMonthly = recurringRevenue * (1 - this.taxRate() / 100) * (this.monthlyCommissionRate() / 100);
      const commissionImplementation = implementationRevenue * (1 - this.taxRate() / 100) * (this.implementationCommissionRate() / 100);
      const totalCommissions = commissionMonthly + commissionImplementation;

      const fixedCost = this.fixedEmployeeCost();
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
  });

  chartData = computed(() => {
    return this.simulationResults().monthlyData.map(d => ({
      month: d.monthYear,
      value: d.cumulativeProfit
    }));
  });

  monthlyProfitChartData = computed(() => {
    return this.simulationResults().monthlyData.map(d => ({
      month: d.monthYear,
      value: d.monthlyProfit
    }));
  });

  onSalesChange(monthYear: string, type: 'subs' | 'impls', event: Event) {
    const value = Math.max(0, (event.target as HTMLInputElement).valueAsNumber || 0);
    this.salesPlan.update(currentPlan => 
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
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  getProfitabilityMonth(): string {
    const monthlyData = this.simulationResults().monthlyData;

    const firstPermanentProfitIndex = monthlyData.findIndex((month, index) => {
      // Condição 1: O mês atual deve ter lucro acumulado positivo.
      if (month.cumulativeProfit <= 0) {
        return false;
      }

      // Condição 2: Todos os meses subsequentes devem também ter lucro acumulado positivo.
      const subsequentMonths = monthlyData.slice(index + 1);
      const dipsBelowZero = subsequentMonths.some(subsequentMonth => subsequentMonth.cumulativeProfit < 0);
      
      // Retorna true se o lucro se sustenta (não há quedas futuras para negativo).
      return !dipsBelowZero;
    });

    if (firstPermanentProfitIndex !== -1) {
      const profitableMonth = monthlyData[firstPermanentProfitIndex];
      return `O funcionário se torna lucrativo de forma sustentável a partir de ${profitableMonth.monthYear}.`;
    }

    return 'O funcionário não atinge o ponto de equilíbrio sustentável no período de 12 meses.';
  }
}