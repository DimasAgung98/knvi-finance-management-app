window.app = window.app || {};

window.app.profit = {
    projections: {},
    recipes: [],
    opexData: [],
    mode: 'detailed', // 'detailed' or 'omzet'
    period: 'Daily', // 'Daily' or 'Monthly'
    simulations: { revenue: 1, fc: 1, opex: 1 },
    chartInstance: null,
    
    init() {
        this.loadData();
        this.render();
    },

    loadData() {
        this.projections = window.app.storage.getProjections();
        this.recipes = window.app.storage.getRecipes();
        this.opexData = window.app.storage.getOpex() || [];
    },

    render() {
        this.loadData();
        
        const mainView = document.getElementById('profit-main-view');
        const emptyState = document.getElementById('profit-empty-state');
        
        const activeOpex = this.opexData.filter(o => o.status !== 'Inactive');

        if (this.recipes.length === 0 && activeOpex.length === 0) {
            if (mainView) mainView.style.display = 'none';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        } else {
            if (mainView) mainView.style.display = 'block';
            if (emptyState) emptyState.style.display = 'none';
        }

        // Render projections list for detailed mode
        const listEl = document.getElementById('profit-projections-list');
        if (listEl) {
            listEl.innerHTML = '';
            this.recipes.forEach(recipe => {
                const projectedQty = this.projections[recipe.id] || 0;
                const activePrice = recipe.finalPrice > 0 ? recipe.finalPrice : recipe.suggestedPrice;
                
                const card = document.createElement('div');
                card.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border: 1px solid var(--border-color); border-radius: var(--radius-sm);';
                card.innerHTML = `
                    <div style="flex: 1;">
                        <h4 style="margin: 0; font-size: 1rem;">${recipe.name}</h4>
                        <div style="font-size: 0.85em; color: var(--text-secondary); margin-top: 4px;">
                            Price: ${window.app.formatter.currency(activePrice)} | COGS: ${window.app.formatter.currency(recipe.totalCost)}
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="font-size: 0.85em; color: var(--text-secondary);">Qty:</label>
                        <input type="number" class="form-control" style="width: 100px; text-align: center;" 
                               value="${projectedQty}" min="0" 
                               oninput="window.app.profit.updateProjection('${recipe.id}', this.value)">
                    </div>
                `;
                listEl.appendChild(card);
            });
        }

        this.updateLabels();
        this.calculateTotal();
    },

    updateProjection(recipeId, value) {
        const qty = parseInt(value) || 0;
        this.projections[recipeId] = qty;
        window.app.storage.saveProjections(this.projections);
        this.calculateTotal();
    },

    handleLoyverseUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            this.parseLoyverseCsv(text);
            event.target.value = ''; // reset input
        };
        reader.readAsText(file);
    },

    parseLoyverseCsv(csvText) {
        const lines = csvText.split('\n');
        if (lines.length < 2) {
            if(window.Swal) Swal.fire({ icon: 'error', title: 'Invalid File', text: 'CSV file is empty or invalid.' });
            return;
        }

        const delimiter = csvText.includes(';') ? ';' : ',';
        const headers = lines[0].toLowerCase().split(new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`)).map(s => s.replace(/(^"|"$)/g, '').trim());
        
        let itemIdx = headers.findIndex(h => h === 'item' || h === 'item name' || h.includes('item'));
        let qtyIdx = headers.findIndex(h => h === 'items sold' || h === 'quantity' || h === 'qty' || h.includes('sold'));

        if (itemIdx === -1 || qtyIdx === -1) {
            if(window.Swal) Swal.fire({ icon: 'error', title: 'Invalid Format', text: 'Could not find "Item" or "Items sold" columns in the CSV.' });
            return;
        }

        let matchCount = 0;
        let notFoundItems = new Set();

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const row = line.split(new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`)).map(s => s.replace(/(^"|"$)/g, '').trim());
            
            const itemName = row[itemIdx];
            const qty = parseFloat(row[qtyIdx]) || 0;
            
            if (!itemName || qty <= 0) continue;

            const recipe = this.recipes.find(r => r.name.toLowerCase() === itemName.toLowerCase());
            if (recipe) {
                this.projections[recipe.id] = qty;
                matchCount++;
            } else {
                notFoundItems.add(itemName);
            }
        }

        window.app.storage.saveProjections(this.projections);
        
        // Force switch to detailed mode if needed, though we don't strictly need to switch mode, 
        // but since we updated projections, let's just re-render.
        this.render();

        if (matchCount > 0) {
            let msg = `Successfully imported sales for ${matchCount} menu items.`;
            if (notFoundItems.size > 0) {
                msg += `\nHowever, ${notFoundItems.size} items from Loyverse were not found in your recipe list. Ensure names match exactly.`;
            }
            if(window.Swal) Swal.fire({ icon: 'success', title: 'Import Successful', text: msg });
        } else {
            if(window.Swal) Swal.fire({ icon: 'warning', title: 'No Matches Found', text: 'No matching recipe names found. Make sure your recipe names match the Loyverse item names exactly.' });
        }
    },

    setMode(newMode) {
        this.mode = newMode;
        const btnDetailed = document.getElementById('btn-profit-mode-detailed');
        const btnOmzet = document.getElementById('btn-profit-mode-omzet');
        const viewDetailed = document.getElementById('profit-view-detailed');
        const viewOmzet = document.getElementById('profit-view-omzet');
        const tableContainer = document.getElementById('profit-table-container');
        const breakEvenContainer = document.getElementById('profit-breakeven-container');

        if (this.mode === 'omzet') {
            btnDetailed.classList.replace('btn-primary', 'btn-secondary');
            btnOmzet.classList.replace('btn-secondary', 'btn-primary');
            viewDetailed.style.display = 'none';
            viewOmzet.style.display = 'block';
            if (tableContainer) tableContainer.style.display = 'none';
            if (breakEvenContainer) breakEvenContainer.style.display = 'none';

            // Auto-calculate FC for omzet if recipes exist
            const avgFc = window.app.finance.FinancialCalculationService.calculateAverageFoodCost(this.recipes);
            const fcInput = document.getElementById('profit-quick-fc');
            const fcHelper = document.getElementById('profit-quick-fc-helper');
            if (avgFc > 0) {
                if (fcInput) {
                    fcInput.value = avgFc.toFixed(1);
                    fcInput.disabled = true;
                }
                if (fcHelper) fcHelper.textContent = `Auto-calculated from Recipe module: ${avgFc.toFixed(1)}%`;
            } else {
                if (fcInput) fcInput.disabled = false;
                if (fcHelper) fcHelper.textContent = `Standard = 30%`;
            }
        } else {
            btnDetailed.classList.replace('btn-secondary', 'btn-primary');
            btnOmzet.classList.replace('btn-primary', 'btn-secondary');
            viewDetailed.style.display = 'block';
            viewOmzet.style.display = 'none';
            if (tableContainer) tableContainer.style.display = 'block';
            if (breakEvenContainer) breakEvenContainer.style.display = 'block';
        }

        this.calculateTotal();
    },

    setPeriod(newPeriod) {
        this.period = newPeriod;
        const btnDaily = document.getElementById('btn-period-daily');
        const btnMonthly = document.getElementById('btn-period-monthly');
        
        if (this.period === 'Daily') {
            btnDaily.classList.replace('btn-secondary', 'btn-primary');
            btnMonthly.classList.replace('btn-primary', 'btn-secondary');
        } else {
            btnMonthly.classList.replace('btn-secondary', 'btn-primary');
            btnDaily.classList.replace('btn-primary', 'btn-secondary');
        }
        
        this.updateLabels();
        this.calculateTotal();
    },

    updateLabels() {
        document.querySelectorAll('.profit-period-label').forEach(el => {
            el.textContent = this.period;
        });
    },

    simulate() {
        this.simulations.revenue = parseFloat(document.getElementById('sim-revenue').value) / 100;
        this.simulations.fc = parseFloat(document.getElementById('sim-fc').value) / 100;
        this.simulations.opex = parseFloat(document.getElementById('sim-opex').value) / 100;

        document.getElementById('sim-revenue-val').textContent = `${(this.simulations.revenue * 100).toFixed(0)}%`;
        document.getElementById('sim-fc-val').textContent = `${(this.simulations.fc * 100).toFixed(0)}%`;
        document.getElementById('sim-opex-val').textContent = `${(this.simulations.opex * 100).toFixed(0)}%`;
        
        this.calculateTotal();
    },

    resetSimulation() {
        document.getElementById('sim-revenue').value = 100;
        document.getElementById('sim-fc').value = 100;
        document.getElementById('sim-opex').value = 100;
        this.simulate();
    },

    calculateTotal() {
        this.loadData();
        const f = window.app.finance;
        
        let rawRevenue = 0;
        let rawCogs = 0;
        let totalCups = 0;

        if (this.mode === 'detailed') {
            this.recipes.forEach(recipe => {
                const qty = this.projections[recipe.id] || 0;
                const activePrice = recipe.finalPrice > 0 ? recipe.finalPrice : recipe.suggestedPrice;
                rawRevenue += (activePrice * qty);
                rawCogs += (recipe.totalCost * qty);
                totalCups += qty;
            });
        } else {
            const omzetInput = document.getElementById('profit-quick-omzet');
            rawRevenue = omzetInput ? (window.app.formatter.unformatInput(omzetInput.value) || 0) : 0;
            
            let fcPct = f.FinancialCalculationService.calculateAverageFoodCost(this.recipes);
            if (fcPct === 0) {
                const fcInput = document.getElementById('profit-quick-fc');
                fcPct = fcInput ? (parseFloat(fcInput.value) || 30) : 30;
            }
            rawCogs = f.FinancialCalculationService.calculateCogs(rawRevenue, fcPct);
        }

        // 1. Apply Revenue and COGS Simulations
        const simRevenue = rawRevenue * this.simulations.revenue;
        const simCogs = rawCogs * (this.simulations.fc);
        const simFcPct = simRevenue > 0 ? (simCogs / simRevenue) * 100 : 0;

        // 2. Process OPEX (Base is always Monthly in database)
        const activeOpexItems = this.opexData.filter(o => o.status !== 'Inactive');
        let totalMonthlyOpex = activeOpexItems.reduce((sum, item) => sum + parseFloat(item.monthlyCost || 0), 0);
        totalMonthlyOpex *= this.simulations.opex;

        // 3. Normalize OPEX based on selected analysis period
        let allocatedOpex = totalMonthlyOpex;
        if (this.period === 'Daily') {
            allocatedOpex = f.OPEXAllocationService.getDailyAllocation(totalMonthlyOpex, 30);
        }

        // 4. Calculate Profits
        const grossProfit = f.ProfitService.calculateGrossProfit(simRevenue, simCogs);
        const netProfit = f.ProfitService.calculateNetProfit(grossProfit, allocatedOpex);
        const netMarginPct = f.ProfitService.calculateNetMargin(netProfit, simRevenue);

        // 5. Break Even Calculation
        if (this.mode === 'detailed' && totalCups > 0) {
            const avgNetProfitPerCup = netProfit / totalCups;
            const breakEvenCups = f.ProfitService.calculateBreakEven(allocatedOpex, avgNetProfitPerCup);
            const beCupsEl = document.getElementById('profit-breakeven-cups');
            if (beCupsEl) beCupsEl.textContent = breakEvenCups > 0 && breakEvenCups !== Infinity ? breakEvenCups.toLocaleString() : 'N/A';
        }

        // 6. Update UI
        this.updateFinancialSummaryUI(simRevenue, simCogs, simFcPct, grossProfit, allocatedOpex, netProfit, netMarginPct);
        this.renderInsights(simRevenue, simCogs, grossProfit, allocatedOpex, netProfit, simFcPct, netMarginPct);
        this.renderCharts(simRevenue, simCogs, grossProfit, allocatedOpex, netProfit);
        if (this.mode === 'detailed') {
            this.renderDetailedTable(allocatedOpex, totalCups, this.simulations);
        }
    },

    updateFinancialSummaryUI(revenue, cogs, fcPct, gross, opex, net, marginPct) {
        document.getElementById('profit-revenue').textContent = window.app.formatter.currency(revenue);
        document.getElementById('profit-cogs').textContent = '- ' + window.app.formatter.currency(cogs);
        document.getElementById('profit-fc-pct').textContent = `${fcPct.toFixed(1)}%`;
        document.getElementById('profit-gross').textContent = window.app.formatter.currency(gross);
        document.getElementById('profit-opex').textContent = '- ' + window.app.formatter.currency(opex);
        
        const netEl = document.getElementById('profit-net');
        netEl.textContent = window.app.formatter.currency(net);
        netEl.style.color = net >= 0 ? 'var(--success-color)' : 'var(--danger-color)';

        document.getElementById('profit-margin-pct').textContent = `${marginPct.toFixed(1)}%`;
        
        const health = window.app.finance.BusinessHealthService.getHealthStatus(fcPct, marginPct);
        const badge = document.getElementById('profit-health-badge');
        badge.textContent = health.status;
        badge.className = `badge ${health.class}`;
    },

    renderInsights(revenue, cogs, gross, opex, net, fcPct, marginPct) {
        const insights = window.app.finance.BusinessHealthService.generateInsights(revenue, cogs, gross, opex, net, fcPct, marginPct);
        const list = document.getElementById('profit-insights-list');
        if (!list) return;

        list.innerHTML = insights.map(ins => `
            <li>
                <i class="${ins.icon}" style="color: var(--${ins.type}-color);"></i> 
                <div>${ins.text}</div>
            </li>
        `).join('');
    },

    renderDetailedTable(totalAllocatedOpex, totalCups, sims) {
        const tbody = document.getElementById('profit-detailed-table-body');
        if (!tbody) return;

        let rowsHTML = '';
        this.recipes.forEach(recipe => {
            const qty = this.projections[recipe.id] || 0;
            if (qty <= 0) return; // Only show projected items
            
            const activePrice = recipe.finalPrice > 0 ? recipe.finalPrice : recipe.suggestedPrice;
            const simPrice = activePrice * sims.revenue;
            const simCost = recipe.totalCost * sims.fc;
            
            // Distribute OPEX proportionally based on quantity to represent per-product true profit
            const itemOpex = totalCups > 0 ? (totalAllocatedOpex / totalCups) * qty : 0;
            const itemRev = simPrice * qty;
            const itemCogs = simCost * qty;
            const itemGross = itemRev - itemCogs;
            const itemNet = itemGross - itemOpex;
            const itemMargin = itemRev > 0 ? (itemNet / itemRev) * 100 : 0;
            const itemFc = itemRev > 0 ? (itemCogs / itemRev) * 100 : 0;
            
            const health = window.app.finance.BusinessHealthService.getHealthStatus(itemFc, itemMargin);
            let recommendation = 'Keep as is';
            if (health.status === 'Critical' || health.status === 'Warning') {
                recommendation = itemFc > 40 ? 'Increase price / reduce cost' : 'Too low margin';
            }

            rowsHTML += `
                <tr>
                    <td><strong>${recipe.name}</strong><br><small class="text-secondary">Qty: ${qty}</small></td>
                    <td style="text-align: right;">${window.app.formatter.currency(itemRev)}</td>
                    <td style="text-align: right; color: var(--text-secondary);">${window.app.formatter.currency(itemCogs)}</td>
                    <td style="text-align: right;">${window.app.formatter.currency(itemGross)}</td>
                    <td style="text-align: right; color: var(--danger-color);">${window.app.formatter.currency(itemOpex)}</td>
                    <td style="text-align: right; font-weight: bold; color: ${itemNet >= 0 ? 'var(--success-color)' : 'var(--danger-color)'};">${window.app.formatter.currency(itemNet)}</td>
                    <td style="text-align: right;">${itemMargin.toFixed(1)}%</td>
                    <td style="text-align: right;">${itemFc.toFixed(1)}%</td>
                    <td style="text-align: center;"><span class="badge ${health.class}">${health.status}</span></td>
                    <td><small style="color: var(--text-secondary);">${recommendation}</small></td>
                </tr>
            `;
        });
        
        if (!rowsHTML) {
            rowsHTML = '<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 20px;">No projections set. Add quantities to analyze products.</td></tr>';
        }
        tbody.innerHTML = rowsHTML;
    },

    renderCharts(revenue, cogs, gross, opex, net) {
        const ctx = document.getElementById('profitWaterfallChart');
        if (!ctx) return;

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const labels = ['Revenue', 'COGS', 'Gross Profit', 'OPEX', 'Net Profit'];
        const data = [revenue, cogs, gross, opex, Math.max(net, 0)];
        const bgColors = [
            'rgba(51, 154, 240, 0.8)', // Primary
            'rgba(240, 62, 62, 0.8)',  // Danger
            'rgba(43, 138, 62, 0.8)',  // Success
            'rgba(245, 159, 0, 0.8)',  // Warning
            net >= 0 ? 'rgba(43, 138, 62, 0.8)' : 'rgba(240, 62, 62, 0.8)'
        ];

        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Financial Flow',
                    data: data,
                    backgroundColor: bgColors,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => window.app.formatter.currency(context.raw)
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => window.app.formatter.currency(value).replace('Rp ', '')
                        }
                    }
                }
            }
        });
    }
};
