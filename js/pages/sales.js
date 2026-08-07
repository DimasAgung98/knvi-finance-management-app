window.app = window.app || {};

window.app.sales = {
    data: [],
    chart: null,

    init() {
        this.data = window.app.storage.getSalesHistory();
    },

    render() {
        this.data = window.app.storage.getSalesHistory();
        this.data.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Filter Data
        const filterTypeEl = document.getElementById('sales-filter-type');
        const filterType = filterTypeEl ? filterTypeEl.value : 'all';
        const filterDate = document.getElementById('sales-filter-date') ? document.getElementById('sales-filter-date').value : '';
        const filterMonth = document.getElementById('sales-filter-month') ? document.getElementById('sales-filter-month').value : '';

        let filteredData = this.data.filter(item => {
            if (filterType === 'today') {
                const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
                return item.date === todayStr || new Date(item.date).toDateString() === new Date().toDateString();
            } else if (filterType === 'date' && filterDate) {
                return item.date === filterDate;
            } else if (filterType === 'month' && filterMonth) {
                return item.date.startsWith(filterMonth);
            }
            return true;
        });

        // Calculate daily opex
        const monthlyOpex = window.app.opex ? window.app.opex.getTotalOpex() : 0;
        const dailyOpex = monthlyOpex / 30;

        const tableBody = document.getElementById('sales-table-body');
        if (!tableBody) return;

        let html = '';
        filteredData.forEach(record => {
            const restartOmzet = record.restartOmzet || 0;
            const restartFee = restartOmzet * 0.25;
            const cash = record.cash || 0;
            const qr = record.qr || 0;

            const recordOpex = record.opex !== undefined ? record.opex : dailyOpex;
            
            const customExpense = window.app.cashflow ? window.app.cashflow.getExpensesByDate(record.date) : 0;
            const totalExpense = recordOpex + customExpense;

            const grossProfit = (record.revenue + restartOmzet) - record.cogs;
            const netProfit = grossProfit - restartFee - totalExpense;
            
            // Format date to e.g., 7 Agustus 2026
            const dateObj = new Date(record.date);
            const formattedDate = !isNaN(dateObj) ? dateObj.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : record.date;

            html += `<tr>
                <td style="white-space: nowrap;">${formattedDate}</td>
                <td style="text-align:right; font-weight: 500;">${window.app.formatter.currency(record.revenue)}</td>
                <td style="text-align:right; color: var(--primary-color); font-weight: 500;">${window.app.formatter.currency(restartOmzet)}</td>
                <td style="text-align:right; font-weight: 700; background: rgba(51, 154, 240, 0.05);">${window.app.formatter.currency(record.revenue + restartOmzet)}</td>
                <td style="text-align:right; font-size:0.9em; color:var(--text-secondary);">
                    C: ${window.app.formatter.currency(cash)}<br>
                    Q: ${window.app.formatter.currency(qr)}
                </td>
                <td style="text-align:right; color: var(--danger-color);">${window.app.formatter.currency(record.cogs)}</td>
                <td style="text-align:right; font-weight:600;">${window.app.formatter.currency(grossProfit)}</td>
                <td style="text-align:right; font-size:0.9em; line-height: 1.4;">
                    <span style="color: var(--danger-color);">Fee: -${window.app.formatter.currency(restartFee)}</span><br>
                    <span style="color: var(--success-color); font-weight: 600;">Terima: ${window.app.formatter.currency(restartOmzet - restartFee)}</span>
                </td>
                <td style="text-align:right; color: var(--danger-color);">
                    ${window.app.formatter.currency(recordOpex)}
                    ${customExpense > 0 ? `<br><span style="font-size:0.85em; color:var(--warning-color);">+${window.app.formatter.currency(customExpense)}<br><i>(Petty Cash)</i></span>` : ''}
                </td>
                <td style="text-align:right; font-weight:700; color: ${netProfit >= 0 ? 'var(--success-color)' : 'var(--danger-color)'}; background: ${netProfit >= 0 ? 'rgba(64, 192, 87, 0.05)' : 'rgba(250, 82, 82, 0.05)'};">${window.app.formatter.currency(netProfit)}</td>
                <td style="text-align:center;">
                    <button class="btn-icon" onclick="window.app.sales.openModal('${record.id}')" style="margin-right: 4px;"><i class="ph ph-pencil-simple" style="color: var(--primary-color);"></i></button>
                    <button class="btn-icon" onclick="window.app.sales.deleteRecord('${record.id}')"><i class="ph ph-trash" style="color: var(--danger-color);"></i></button>
                </td>
            </tr>`;
        });
        
        if (filteredData.length === 0) {
            html = '<tr><td colspan="11" style="text-align:center; color: var(--text-secondary); padding: 24px;">No sales records found for this period.</td></tr>';
        }
        
        tableBody.innerHTML = html;
        this.renderChart(dailyOpex);
    },

    renderChart(dailyOpex) {
        const canvas = document.getElementById('salesHistoryChart');
        if (!canvas) return;
        
        // ensure chart.js is loaded
        if (typeof Chart === 'undefined') return;

        const ctx = canvas.getContext('2d');

        if (this.chart) {
            this.chart.destroy();
        }

        // Apply same filters for the chart
        const filterTypeEl = document.getElementById('sales-filter-type');
        const filterType = filterTypeEl ? filterTypeEl.value : 'all';
        const filterDate = document.getElementById('sales-filter-date') ? document.getElementById('sales-filter-date').value : '';
        const filterMonth = document.getElementById('sales-filter-month') ? document.getElementById('sales-filter-month').value : '';

        let filteredData = this.data.filter(item => {
            if (filterType === 'today') {
                const todayStr = new Date().toLocaleDateString('en-CA');
                return item.date === todayStr || new Date(item.date).toDateString() === new Date().toDateString();
            } else if (filterType === 'date' && filterDate) {
                return item.date === filterDate;
            } else if (filterType === 'month' && filterMonth) {
                return item.date.startsWith(filterMonth);
            }
            return true;
        });

        // Prepare data for chart (sort chronological)
        const sortedData = [...filteredData].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const labels = sortedData.map(d => d.date);
        const revenues = sortedData.map(d => d.revenue + (d.restartOmzet || 0));
        const netProfits = sortedData.map(d => {
            const restartOmzet = d.restartOmzet || 0;
            const totalGross = d.revenue + restartOmzet;
            const gp = totalGross - d.cogs;
            const op = d.opex !== undefined ? d.opex : dailyOpex;
            const customExp = window.app.cashflow ? window.app.cashflow.getExpensesByDate(d.date) : 0;
            const restartFee = restartOmzet * 0.25;
            return gp - restartFee - (op + customExp);
        });

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Net Sales (Revenue)',
                        data: revenues,
                        borderColor: '#339af0',
                        backgroundColor: 'rgba(51, 154, 240, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Net Profit',
                        data: netProfits,
                        borderColor: '#40c057',
                        backgroundColor: 'rgba(64, 192, 87, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'Rp ' + (value / 1000) + 'k';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    },

    onFilterChange() {
        const type = document.getElementById('sales-filter-type').value;
        const dateInput = document.getElementById('sales-filter-date');
        const monthInput = document.getElementById('sales-filter-month');
        
        dateInput.style.display = type === 'date' ? 'block' : 'none';
        monthInput.style.display = type === 'month' ? 'block' : 'none';
        
        this.render();
    },

    openModal(recordId = null) {
        const monthlyOpex = window.app.opex ? window.app.opex.getTotalOpex() : 0;
        const dailyOpex = monthlyOpex / 30;
        
        let record = null;
        if (recordId) {
            record = this.data.find(d => d.id === recordId);
        }

        // Initial formatted date for today or record date
        const targetDate = record ? new Date(record.date) : new Date();
        const formattedDateText = !isNaN(targetDate) ? targetDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : (record ? record.date : '');
        const dateValue = record ? record.date : targetDate.toISOString().split('T')[0];
        
        const revVal = record ? window.app.formatter.number(record.revenue) : '';
        const cashVal = record ? window.app.formatter.number(record.cash) : '';
        const qrVal = record ? window.app.formatter.number(record.qr) : '';
        const restartVal = record && record.restartOmzet ? window.app.formatter.number(record.restartOmzet) : '';
        const gpVal = record ? window.app.formatter.number(record.revenue - record.cogs) : '';

        const html = `
            <input type="hidden" id="sales-form-id" value="${recordId || ''}">
            <div style="margin-bottom: 16px;">
                <label style="display:flex; justify-content:space-between; margin-bottom:5px; font-weight:500;">
                    <span>Date</span>
                    <span id="date-text-display" style="color:var(--primary-color); font-weight:600;">${formattedDateText}</span>
                </label>
                <input type="date" id="sales-form-date" class="form-control" value="${dateValue}" onchange="
                    const d = new Date(this.value);
                    if(!isNaN(d)) {
                        document.getElementById('date-text-display').textContent = d.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'});
                    }
                ">
            </div>
            <div style="margin-bottom: 16px;">
                <label style="display:block; margin-bottom:5px; font-weight:500;">Total Omzet (Loyverse)</label>
                <input type="text" id="sales-form-revenue" class="form-control" placeholder="0" value="${revVal}" oninput="window.app.formatter.formatInput(this)">
            </div>
            
            <div style="display:flex; gap:16px; margin-bottom: 16px;">
                <div style="flex:1;">
                    <label style="display:block; margin-bottom:5px; font-weight:500;">Cash</label>
                    <input type="text" id="sales-form-cash" class="form-control" placeholder="0" value="${cashVal}" oninput="window.app.formatter.formatInput(this)">
                </div>
                <div style="flex:1;">
                    <label style="display:block; margin-bottom:5px; font-weight:500;">QR</label>
                    <input type="text" id="sales-form-qr" class="form-control" placeholder="0" value="${qrVal}" oninput="window.app.formatter.formatInput(this)">
                </div>
            </div>

            <div style="margin-bottom: 16px; padding: 12px; background: rgba(51, 154, 240, 0.05); border-radius: 8px;">
                <label style="display:block; margin-bottom:5px; font-weight:500; color: var(--primary-color);">Omzet Restart (Opsional)</label>
                <small style="display:block; margin-bottom:8px; color:var(--text-secondary);">Masukkan omzet jalur Restart. Sistem akan otomatis memotong 25% sebagai Restart Fee dari Net Profit.</small>
                <input type="text" id="sales-form-restart" class="form-control" placeholder="0" value="${restartVal}" oninput="window.app.formatter.formatInput(this)">
            </div>

            <div style="margin-bottom: 16px; padding: 12px; border: 1px dashed var(--border-color); border-radius: 8px;">
                <label style="display:block; margin-bottom:5px; font-weight:500;">Gross Profit (Laba Kotor Loyverse)</label>
                <small style="display:block; margin-bottom:8px; color:var(--text-secondary);">Wajib diisi. Masukkan angka <b>"Gross profit"</b> dari laporan Loyverse Anda. Sistem akan otomatis menghitung mundur modal/COGS Anda.</small>
                <input type="text" id="sales-form-gp" class="form-control" placeholder="0" value="${gpVal}" oninput="window.app.formatter.formatInput(this)">
            </div>
            <div style="margin-bottom: 16px; padding: 12px; background: rgba(252, 196, 25, 0.05); border-radius: 8px;">
                <label style="display:flex; justify-content:space-between; margin-bottom:5px; font-weight:500;">
                    <span>Daily OPEX (Beban Operasional Harian)</span>
                    <span style="color:var(--danger-color); font-weight:600;">${window.app.formatter.currency(dailyOpex)}</span>
                </label>
                <small style="display:block; margin-bottom:12px; color:var(--text-secondary);">Sistem otomatis menghitung beban harian dari menu OPEX. Angka ini sudah dikunci (otomatis memotong laba).</small>
                
                <small style="display:block; color:var(--warning-color); font-weight: 500;">
                    <i class="ph ph-info"></i> Pengeluaran tak terduga (beli lakban, parkir, dsb) sekarang dicatat di menu <b>Buku Kas</b>.
                </small>
                
                <!-- Hidden input for the fixed daily opex to be saved in DB -->
                <input type="hidden" id="sales-form-opex" value="${dailyOpex}">
            </div>
            <button class="btn btn-primary" style="width: 100%;" onclick="window.app.sales.saveRecord()">Save Record</button>
        `;
        window.app.modal.open('Add Sales Record', html);
    },

    saveRecord() {
        const date = document.getElementById('sales-form-date').value;
        const revVal = document.getElementById('sales-form-revenue').value;
        const cashVal = document.getElementById('sales-form-cash').value;
        const qrVal = document.getElementById('sales-form-qr').value;
        const restartVal = document.getElementById('sales-form-restart').value;
        const gpVal = document.getElementById('sales-form-gp').value;
        const opexVal = document.getElementById('sales-form-opex').value;

        if (!date || !revVal) {
            if(window.Swal) Swal.fire({ icon: 'warning', title: 'Incomplete', text: 'Please fill out date and revenue.'});
            return;
        }

        const revenue = parseInt(revVal.replace(/\./g, '')) || 0;
        const cash = parseInt(cashVal.replace(/\./g, '')) || 0;
        const qr = parseInt(qrVal.replace(/\./g, '')) || 0;
        const restartOmzet = parseInt(restartVal.replace(/\./g, '')) || 0;
        const loyverseGp = parseInt(gpVal.replace(/\./g, '')) || 0;
        
        // Calculate COGS backwards from Loyverse Gross Profit
        // COGS = Net Sales - Gross Profit
        const cogs = revenue > 0 ? (revenue - loyverseGp) : 0;
        
        const opex = parseFloat(document.getElementById('sales-form-opex').value) || 0;

        // Validation for Cash + QR == Loyverse Revenue
        if (cash + qr !== revenue) {
            if(window.Swal) Swal.fire({ 
                icon: 'error', 
                title: 'Data Tidak Sinkron!', 
                html: `Total Cash + QR (<b>${window.app.formatter.currency(cash + qr)}</b>) <br> harus sama persis dengan Total Omzet Loyverse (<b>${window.app.formatter.currency(revenue)}</b>).<br>Ini untuk mencegah kecurangan/minus.`
            });
            return;
        }

        const id = document.getElementById('sales-form-id') ? document.getElementById('sales-form-id').value : '';

        const newRecord = {
            id: id || window.app.storage.generateId('sales'),
            date,
            revenue,
            cash,
            qr,
            restartOmzet,
            cogs,
            opex
        };

        // Fetch latest data to prevent race conditions
        this.data = window.app.storage.getSalesHistory();

        if (id) {
            const existingIdx = this.data.findIndex(d => d.id === id);
            if (existingIdx !== -1) {
                this.data[existingIdx] = newRecord;
            } else {
                this.data.push(newRecord);
            }
        } else {
            const existingIdx = this.data.findIndex(d => d.date === date);
            if (existingIdx !== -1) {
                this.data[existingIdx] = newRecord;
            } else {
                this.data.push(newRecord);
            }
        }

        window.app.storage.saveSalesHistory(this.data);
        if(window.app.modal) window.app.modal.close();
        this.render();
        
        // Render cashflow module if active
        if (window.app.cashflow && typeof window.app.cashflow.render === 'function') {
            window.app.cashflow.render();
        }

        if(window.Swal) Swal.fire({ icon: 'success', title: 'Saved!', text: 'Sales record saved.', timer: 1500, showConfirmButton: false });
    },

    deleteRecord(id) {
        if(!window.Swal) return;
        Swal.fire({
            title: 'Delete Record?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#fa5252',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                this.data = window.app.storage.getSalesHistory();
                this.data = this.data.filter(d => d.id !== id);
                window.app.storage.saveSalesHistory(this.data);
                this.render();
                Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
            }
        });
    }
};
