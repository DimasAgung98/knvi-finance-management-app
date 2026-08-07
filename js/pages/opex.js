window.app = window.app || {};

window.app.opex = {
    data: [],
    sortCol: 'name',
    sortAsc: true,
    chartInstances: {},

    init() {
        this.loadData();
        this.render();
    },

    loadData() {
        // Handle migration of old data gracefully
        const rawData = window.app.storage.getOpex() || [];
        this.data = rawData.map(item => {
            return {
                id: item.id,
                name: item.name,
                category: item.category || 'Other',
                originalAmount: item.originalAmount !== undefined ? item.originalAmount : item.monthlyCost,
                period: item.period || 'Monthly',
                monthlyCost: item.monthlyCost, // The converted allocation
                startDate: item.startDate || new Date().toISOString().split('T')[0],
                endDate: item.endDate || '',
                recurring: item.recurring !== undefined ? item.recurring : true,
                status: item.status || 'Active',
                notes: item.notes || ''
            };
        });
    },

    convertAmountToMonthly(amount, period) {
        amount = parseFloat(amount) || 0;
        switch (period) {
            case 'Yearly': return amount / 12;
            case 'Quarterly': return amount / 3;
            case 'Monthly': return amount;
            case 'Weekly': return amount * 4.33;
            case 'Daily': return Math.round(amount * (365 / 12)); // approx 30.41 or just 30
            case 'One Time': return amount; // Or divide by a depreciation period, but we'll use full amount for the month
            default: return amount;
        }
    },

    getCategoryColor(category) {
        const colors = {
            'Payroll': '#339af0',
            'Utilities': '#fcc419',
            'Rent': '#ff922b',
            'Maintenance': '#845ef7',
            'Marketing': '#ff6b6b',
            'Software': '#20c997',
            'Administration': '#94d82d',
            'Insurance': '#51cf66',
            'Taxes': '#f06595',
            'Depreciation': '#cc5de8',
            'Transportation': '#8ce99a',
            'Other': '#adb5bd'
        };
        return colors[category] || colors['Other'];
    },

    render() {
        const emptyState = document.getElementById('opex-empty-state');
        const mainView = document.getElementById('opex-main-view');
        
        if (!emptyState || !mainView) return; // Wait until DOM is ready

        if (this.data.length === 0) {
            emptyState.style.display = 'flex';
            mainView.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            mainView.style.display = 'block';
            
            this.updateCategoryFilters();
            this.renderMetrics();
            this.renderInsights();
            this.renderCharts();
            this.renderCategorySummary();
            this.renderTable();
        }

        // Auto-update Profit Analysis if it's active
        if(window.app.profit && typeof window.app.profit.calculateTotal === 'function') {
            window.app.profit.calculateTotal();
        }
    },

    renderMetrics() {
        const grid = document.getElementById('opex-metrics-grid');
        if (!grid) return;

        const totalMonthly = this.getTotalOpex();
        const activeExpenses = this.data.filter(item => item.status === 'Active');
        const numActive = activeExpenses.length;
        
        let largestExpense = { name: '-', monthlyCost: 0 };
        if (numActive > 0) {
            largestExpense = activeExpenses.reduce((max, item) => item.monthlyCost > max.monthlyCost ? item : max, activeExpenses[0]);
        }

        const avgExpense = numActive > 0 ? totalMonthly / numActive : 0;

        grid.innerHTML = `
            <div class="card metric-card">
                <span class="metric-title">Total Monthly OPEX</span>
                <span class="metric-value" style="color: var(--danger-color);">${window.app.formatter.currency(totalMonthly)}</span>
            </div>
            <div class="card metric-card">
                <span class="metric-title">Largest Expense</span>
                <span class="metric-value">${window.app.formatter.currency(largestExpense.monthlyCost)}</span>
                <span style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">${largestExpense.name}</span>
            </div>
            <div class="card metric-card">
                <span class="metric-title">Active Expenses</span>
                <span class="metric-value">${numActive}</span>
            </div>
            <div class="card metric-card">
                <span class="metric-title">Avg. Monthly Expense</span>
                <span class="metric-value">${window.app.formatter.currency(avgExpense)}</span>
            </div>
        `;
    },

    renderInsights() {
        const list = document.getElementById('opex-insights-list');
        if (!list) return;

        let insights = [];
        const totalMonthly = this.getTotalOpex();
        const activeExpenses = this.data.filter(item => item.status === 'Active');

        if (totalMonthly === 0) {
            list.innerHTML = `<li><i class="ph ph-info" style="color: var(--primary-color);"></i> <div>No active expenses to analyze.</div></li>`;
            return;
        }

        // Calculate category totals
        const catTotals = {};
        activeExpenses.forEach(item => {
            catTotals[item.category] = (catTotals[item.category] || 0) + parseFloat(item.monthlyCost);
        });

        const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
        
        if (sortedCats.length > 0) {
            const topCat = sortedCats[0];
            const pct = ((topCat[1] / totalMonthly) * 100).toFixed(1);
            insights.push(`<li><i class="ph ph-chart-pie-slice" style="color: var(--primary-color);"></i> <div><strong>${topCat[0]}</strong> represents ${pct}% of your total OPEX.</div></li>`);
            insights.push(`<li><i class="ph ph-info" style="color: var(--info-color);"></i> <div><strong>${topCat[0]}</strong> is your biggest operational expense category.</div></li>`);
        }

        // Check for dominant expenses
        const dominant = activeExpenses.find(item => (item.monthlyCost / totalMonthly) > 0.4);
        if (dominant) {
            insights.push(`<li><i class="ph ph-warning" style="color: var(--warning-color);"></i> <div><strong>${dominant.name}</strong> exceeds 40% of your total operational costs.</div></li>`);
        } else {
            insights.push(`<li><i class="ph ph-check-circle" style="color: var(--success-color);"></i> <div>Your expenses are well distributed with no single dominant cost over 40%.</div></li>`);
        }

        // Software/Marketing checks
        if (catTotals['Software'] && (catTotals['Software'] / totalMonthly) < 0.05) {
            insights.push(`<li><i class="ph ph-desktop" style="color: var(--info-color);"></i> <div>Software subscriptions account for a very low percentage of your costs.</div></li>`);
        }

        list.innerHTML = insights.join('');
    },

    renderCharts() {
        if (typeof Chart === 'undefined') return;

        const activeExpenses = this.data.filter(item => item.status === 'Active');
        
        // Category Pie Chart
        const catTotals = {};
        activeExpenses.forEach(item => {
            catTotals[item.category] = (catTotals[item.category] || 0) + parseFloat(item.monthlyCost);
        });

        const pieLabels = Object.keys(catTotals);
        const pieData = Object.values(catTotals);
        const pieColors = pieLabels.map(cat => this.getCategoryColor(cat));

        this.initChart('opexPieChart', 'doughnut', {
            labels: pieLabels,
            datasets: [{
                data: pieData,
                backgroundColor: pieColors,
                borderWidth: 0
            }]
        }, {
            cutout: '65%',
            plugins: {
                legend: { position: 'right', labels: { color: '#a0a0a0', boxWidth: 12 } }
            }
        });

        // Top 10 Bar Chart
        const top10 = [...activeExpenses].sort((a, b) => b.monthlyCost - a.monthlyCost).slice(0, 10);
        
        this.initChart('opexBarChart', 'bar', {
            labels: top10.map(item => item.name),
            datasets: [{
                label: 'Monthly Cost (Rp)',
                data: top10.map(item => item.monthlyCost),
                backgroundColor: top10.map(item => this.getCategoryColor(item.category)),
                borderRadius: 4
            }]
        }, {
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(200,200,200,0.1)' }, ticks: { color: '#a0a0a0' } },
                x: { display: false } // Hide labels to save space
            },
            plugins: { legend: { display: false } }
        });
    },

    initChart(canvasId, type, data, extraOptions = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        if (this.chartInstances[canvasId]) {
            this.chartInstances[canvasId].destroy();
        }

        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            color: '#a0a0a0'
        };

        this.chartInstances[canvasId] = new Chart(canvas, {
            type: type,
            data: data,
            options: { ...baseOptions, ...extraOptions }
        });
    },

    renderCategorySummary() {
        const list = document.getElementById('opex-category-summary');
        if (!list) return;

        const activeExpenses = this.data.filter(item => item.status === 'Active');
        const catTotals = {};
        activeExpenses.forEach(item => {
            catTotals[item.category] = (catTotals[item.category] || 0) + parseFloat(item.monthlyCost);
        });

        const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
        
        if (sortedCats.length === 0) {
            list.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 20px;">No categories to display.</div>';
            return;
        }

        let html = '';
        sortedCats.forEach(([category, total]) => {
            const color = this.getCategoryColor(category);
            html += `
                <div class="stat-item" style="align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="width: 12px; height: 12px; border-radius: 50%; background-color: ${color}; display: inline-block;"></span>
                        <span class="stat-label">${category}</span>
                    </div>
                    <span class="stat-val">${window.app.formatter.currency(total)}</span>
                </div>
            `;
        });
        
        list.innerHTML = html;
    },

    updateCategoryFilters() {
        const filterSelect = document.getElementById('opex-filter-category');
        if (!filterSelect) return;
        
        const currentVal = filterSelect.value;
        const categories = [...new Set(this.data.map(item => item.category))].sort();
        
        filterSelect.innerHTML = '<option value="">All Categories</option>' + 
            categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
            
        if (categories.includes(currentVal)) {
            filterSelect.value = currentVal;
        }
    },

    sortTable(col) {
        if (this.sortCol === col) {
            this.sortAsc = !this.sortAsc;
        } else {
            this.sortCol = col;
            this.sortAsc = true;
        }
        this.renderTable();
    },

    renderTable() {
        const tbody = document.getElementById('opex-list');
        const searchInput = document.getElementById('opex-search');
        const categoryFilter = document.getElementById('opex-filter-category');
        const statusFilter = document.getElementById('opex-filter-status');
        
        if (!tbody) return;

        let filtered = [...this.data];

        // Search
        if (searchInput && searchInput.value) {
            const q = searchInput.value.toLowerCase();
            filtered = filtered.filter(item => item.name.toLowerCase().includes(q));
        }

        // Category
        if (categoryFilter && categoryFilter.value) {
            filtered = filtered.filter(item => item.category === categoryFilter.value);
        }

        // Status
        if (statusFilter && statusFilter.value) {
            filtered = filtered.filter(item => item.status === statusFilter.value);
        }

        // Sort
        filtered.sort((a, b) => {
            let valA = a[this.sortCol];
            let valB = b[this.sortCol];
            
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return this.sortAsc ? -1 : 1;
            if (valA > valB) return this.sortAsc ? 1 : -1;
            return 0;
        });

        tbody.innerHTML = '';

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 30px;">No expenses match your search.</td></tr>`;
            return;
        }

        filtered.forEach(item => {
            const color = this.getCategoryColor(item.category);
            const statusColor = item.status === 'Active' ? 'var(--success-color)' : 'var(--text-muted)';
            const recurringIcon = item.recurring ? '<i class="ph ph-arrows-clockwise" title="Recurring"></i>' : '';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${item.name}</strong> <span style="color: var(--primary-color); margin-left: 4px;">${recurringIcon}</span></td>
                <td>
                    <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 4px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); font-size: 0.85rem;">
                        <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${color};"></span>
                        ${item.category}
                    </span>
                </td>
                <td style="text-align: right;">${window.app.formatter.currency(item.originalAmount)}</td>
                <td style="text-align: center;"><span class="badge badge-secondary">${item.period}</span></td>
                <td style="text-align: right; color: var(--danger-color); font-weight: 600;">${window.app.formatter.currency(item.monthlyCost)}</td>
                <td style="text-align: center;"><span style="color: ${statusColor}; font-weight: 600; font-size: 0.9rem;">${item.status}</span></td>
                <td style="text-align: center;">
                    <div style="display: flex; justify-content: center; gap: 8px;">
                        <button class="btn btn-secondary" onclick="window.app.opex.edit('${item.id}')" style="padding: 6px;"><i class="ph ph-pencil-simple"></i></button>
                        <button class="btn btn-secondary" onclick="window.app.opex.delete('${item.id}')" style="padding: 6px; color: var(--danger-color);"><i class="ph ph-trash"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    openModal(editId = null) {
        let expense = {
            id: '',
            name: '',
            category: 'Payroll',
            originalAmount: 0,
            period: 'Monthly',
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            recurring: true,
            status: 'Active',
            notes: ''
        };

        if (editId) {
            expense = this.data.find(item => item.id === editId) || expense;
        }

        const categories = ['Payroll', 'Utilities', 'Rent', 'Maintenance', 'Marketing', 'Software', 'Administration', 'Insurance', 'Taxes', 'Depreciation', 'Transportation', 'Other'];
        const periods = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly', 'One Time'];

        const html = `
            <form id="opex-form" onsubmit="window.app.opex.save(event, '${editId || ''}')">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <div style="grid-column: span 2;">
                        <label style="display:block; margin-bottom:5px; font-weight:500;">Expense Name</label>
                        <input type="text" id="opex-name" class="form-control" required value="${expense.name}" placeholder="e.g. Barista Salary">
                    </div>
                    
                    <div>
                        <label style="display:block; margin-bottom:5px; font-weight:500;">Category</label>
                        <select id="opex-category" class="form-control" required>
                            ${categories.map(cat => `<option value="${cat}" ${cat === expense.category ? 'selected' : ''}>${cat}</option>`).join('')}
                        </select>
                    </div>

                    <div>
                        <label style="display:block; margin-bottom:5px; font-weight:500;">Billing Period</label>
                        <select id="opex-period" class="form-control" required onchange="window.app.opex.previewConversion()">
                            ${periods.map(p => `<option value="${p}" ${p === expense.period ? 'selected' : ''}>${p}</option>`).join('')}
                        </select>
                    </div>

                    <div style="grid-column: span 2;">
                        <label style="display:block; margin-bottom:5px; font-weight:500;">Original Amount (Rp)</label>
                        <input type="text" id="opex-original-amount" class="form-control" required value="${window.app.formatter.currency(expense.originalAmount).replace('Rp ', '')}" oninput="window.app.formatter.formatInput(this); window.app.opex.previewConversion()">
                        <div id="opex-conversion-preview" style="font-size: 0.85rem; color: var(--success-color); margin-top: 4px;">
                            Estimated Monthly Allocation: Rp 0
                        </div>
                    </div>

                    <div>
                        <label style="display:block; margin-bottom:5px; font-weight:500;">Start Date</label>
                        <input type="date" id="opex-start-date" class="form-control" required value="${expense.startDate}">
                    </div>

                    <div>
                        <label style="display:block; margin-bottom:5px; font-weight:500;">End Date (Optional)</label>
                        <input type="date" id="opex-end-date" class="form-control" value="${expense.endDate}">
                    </div>

                    <div>
                        <label style="display:block; margin-bottom:5px; font-weight:500;">Status</label>
                        <select id="opex-status" class="form-control">
                            <option value="Active" ${expense.status === 'Active' ? 'selected' : ''}>Active</option>
                            <option value="Inactive" ${expense.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>

                    <div style="display: flex; align-items: center; margin-top: 24px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="opex-recurring" ${expense.recurring ? 'checked' : ''} style="width: 18px; height: 18px;">
                            <span style="font-weight: 500;">Recurring Expense</span>
                        </label>
                    </div>

                    <div style="grid-column: span 2;">
                        <label style="display:block; margin-bottom:5px; font-weight:500;">Notes (Optional)</label>
                        <textarea id="opex-notes" class="form-control" rows="2">${expense.notes}</textarea>
                    </div>
                </div>

                <div style="display:flex; justify-content:flex-end; gap: 10px; margin-top:20px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                    <button type="button" class="btn btn-secondary" onclick="window.app.modal.close()">Cancel</button>
                    <button type="submit" class="btn btn-primary"><i class="ph ph-floppy-disk"></i> Save Expense</button>
                </div>
            </form>
        `;
        window.app.modal.open(editId ? 'Edit Expense' : 'Add New Expense', html);
        
        // Trigger initial preview
        setTimeout(() => this.previewConversion(), 50);
    },

    previewConversion() {
        const amountInput = document.getElementById('opex-original-amount');
        const periodSelect = document.getElementById('opex-period');
        const previewDiv = document.getElementById('opex-conversion-preview');
        
        if (!amountInput || !periodSelect || !previewDiv) return;

        const amount = window.app.formatter.unformatInput(amountInput.value);
        const period = periodSelect.value;
        const monthly = this.convertAmountToMonthly(amount, period);
        
        previewDiv.textContent = `Estimated Monthly Allocation: ${window.app.formatter.currency(monthly)}`;
    },

    edit(id) {
        this.openModal(id);
    },

    save(event, editId) {
        event.preventDefault();
        
        const name = document.getElementById('opex-name').value.trim();
        const category = document.getElementById('opex-category').value;
        const period = document.getElementById('opex-period').value;
        const originalAmount = window.app.formatter.unformatInput(document.getElementById('opex-original-amount').value);
        const startDate = document.getElementById('opex-start-date').value;
        const endDate = document.getElementById('opex-end-date').value;
        const status = document.getElementById('opex-status').value;
        const recurring = document.getElementById('opex-recurring').checked;
        const notes = document.getElementById('opex-notes').value.trim();
        
        const monthlyCost = this.convertAmountToMonthly(originalAmount, period);
        
        const newRecord = {
            id: editId || window.app.storage.generateId('opex'),
            name, category, period, originalAmount, monthlyCost, startDate, endDate, status, recurring, notes
        };

        // Fetch latest data to prevent race conditions
        this.data = window.app.storage.getOpex();

        if (editId) {
            const index = this.data.findIndex(d => d.id === editId);
            if (index !== -1) {
                this.data[index] = newRecord;
            } else {
                this.data.push(newRecord);
            }
        } else {
            this.data.push(newRecord);
        }

        window.app.storage.saveOpex(this.data);
        
        this.render();
        window.app.modal.close();
        window.app.toast.show('Expense saved successfully!');
    },

    delete(id) {
        window.app.toast.confirm(
            'Delete Expense?', 
            'Are you sure you want to delete this expense item? This will affect your profit analysis.'
        ).then((result) => {
            if (result.isConfirmed) {
                this.data = window.app.storage.getOpex();
                this.data = this.data.filter(d => d.id !== id);
                window.app.storage.saveOpex(this.data);
                this.render();
                window.app.toast.show('Expense deleted.');
            }
        });
    },

    getTotalOpex() {
        return this.data
            .filter(item => item.status === 'Active')
            .reduce((sum, item) => sum + parseFloat(item.monthlyCost || 0), 0);
    }
};
