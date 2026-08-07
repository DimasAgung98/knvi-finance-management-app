window.app = window.app || {};

window.app.finance = {
    OPEXAllocationService: {
        getDailyAllocation(monthlyOpex, operatingDays = 30) {
            if (!monthlyOpex || monthlyOpex <= 0) return 0;
            return monthlyOpex / operatingDays;
        }
    },

    RevenueService: {
        normalizeRevenue(revenue, inputPeriod, analysisPeriod, operatingDays = 30) {
            // Converts input revenue to match the analysis period
            if (inputPeriod === analysisPeriod) return revenue;
            
            if (inputPeriod === 'Daily' && analysisPeriod === 'Monthly') {
                return revenue * operatingDays;
            }
            if (inputPeriod === 'Monthly' && analysisPeriod === 'Daily') {
                return revenue / operatingDays;
            }
            return revenue;
        }
    },

    FinancialCalculationService: {
        calculateAverageFoodCost(recipes) {
            if (!recipes || recipes.length === 0) return 0;
            
            let totalFc = 0;
            let validCount = 0;
            recipes.forEach(r => {
                const sp = r.finalPrice > 0 ? r.finalPrice : r.suggestedPrice;
                if (sp > 0) {
                    totalFc += (r.totalCost / sp) * 100;
                    validCount++;
                }
            });
            return validCount > 0 ? (totalFc / validCount) : 0;
        },
        calculateCogs(revenue, foodCostPercentage) {
            return revenue * (foodCostPercentage / 100);
        }
    },

    ProfitService: {
        calculateGrossProfit(revenue, cogs) {
            return revenue - cogs;
        },
        calculateNetProfit(grossProfit, allocatedOpex) {
            return grossProfit - allocatedOpex;
        },
        calculateNetMargin(netProfit, revenue) {
            if (!revenue || revenue <= 0) return 0;
            return (netProfit / revenue) * 100;
        },
        calculateBreakEven(monthlyOpex, avgNetProfitPerCup) {
            if (!avgNetProfitPerCup || avgNetProfitPerCup <= 0) return 0;
            return Math.ceil(monthlyOpex / avgNetProfitPerCup);
        }
    },

    BusinessHealthService: {
        getHealthStatus(foodCostPct, netMarginPct) {
            // Food cost evaluation
            let fcScore = 0;
            if (foodCostPct <= 35) fcScore = 3;
            else if (foodCostPct <= 40) fcScore = 2;
            else if (foodCostPct <= 50) fcScore = 1;
            else fcScore = 0;

            // Margin evaluation
            let marginScore = 0;
            if (netMarginPct >= 20) marginScore = 3;
            else if (netMarginPct >= 10) marginScore = 2;
            else if (netMarginPct > 0) marginScore = 1;
            else marginScore = 0;

            const total = fcScore + marginScore;
            
            if (total >= 5) return { status: 'Excellent', class: 'badge-success', color: 'var(--success-color)' };
            if (total >= 3) return { status: 'Good', class: 'badge-primary', color: 'var(--primary-color)' };
            if (total >= 1) return { status: 'Warning', class: 'badge-warning', color: 'var(--warning-color)' };
            return { status: 'Critical', class: 'badge-danger', color: 'var(--danger-color)' };
        },

        generateInsights(revenue, cogs, grossProfit, opex, netProfit, foodCostPct, netMarginPct) {
            let insights = [];
            
            // Food Cost
            if (foodCostPct <= 35) {
                insights.push({ type: 'success', text: `Food Cost (${foodCostPct.toFixed(1)}%) is within the healthy target (< 35%).`, icon: 'ph-check-circle' });
            } else if (foodCostPct <= 45) {
                insights.push({ type: 'warning', text: `Food Cost (${foodCostPct.toFixed(1)}%) is slightly high. Target is 30-35%.`, icon: 'ph-warning' });
            } else {
                insights.push({ type: 'danger', text: `Critical: Food Cost is extremely high. Consider increasing prices or reducing ingredient costs.`, icon: 'ph-warning-circle' });
            }

            // OPEX
            let opexRatio = revenue > 0 ? (opex / revenue) * 100 : 0;
            if (revenue > 0) {
                if (opexRatio < 20) {
                    insights.push({ type: 'success', text: `Operational Expenses represent only ${opexRatio.toFixed(1)}% of revenue, which is excellent.`, icon: 'ph-trend-up' });
                } else if (opexRatio > 40) {
                    insights.push({ type: 'danger', text: `OPEX is consuming ${opexRatio.toFixed(1)}% of your revenue. You need to reduce operational costs to stay profitable.`, icon: 'ph-trend-down' });
                }
            }

            // Margin
            if (netMarginPct >= 20) {
                insights.push({ type: 'success', text: `Net Profit Margin is outstanding (${netMarginPct.toFixed(1)}%). Your business is very healthy.`, icon: 'ph-money' });
            } else if (netMarginPct > 0 && netMarginPct < 10) {
                insights.push({ type: 'warning', text: `Net Margin is positive but very thin (${netMarginPct.toFixed(1)}%). Small changes in sales or costs could result in losses.`, icon: 'ph-warning' });
            } else if (netMarginPct <= 0) {
                insights.push({ type: 'danger', text: `Your business is currently operating at a loss. Review both pricing and expenses immediately.`, icon: 'ph-chart-line-down' });
            }

            return insights;
        }
    }
};
