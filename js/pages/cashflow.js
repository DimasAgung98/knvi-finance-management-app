window.app = window.app || {};

window.app.cashflow = {
    expenses: [],
    sales: [],

    init() {
        this.loadData();
        // Initialize filter to today if needed, or leave as default HTML 'all'
    },

    loadData() {
        this.expenses = window.app.storage.getDailyExpenses() || [];
        this.sales = window.app.storage.getSalesHistory() || [];
    },

    calculateBalances() {
        this.loadData();
        
        let cashIn = 0, cashOut = 0;
        let qrIn = 0, qrOut = 0;

        // Money In from Sales (Revenue is handled, but specific Cash and QR are the exact payment methods)
        this.sales.forEach(s => {
            cashIn += (s.cash || 0);
            qrIn += (s.qr || 0);
        });

        // Money Out from Expenses
        this.expenses.forEach(e => {
            if (e.paymentMethod === 'Cash') {
                cashOut += e.amount;
            } else if (e.paymentMethod === 'QR') {
                qrOut += e.amount;
            }
        });

        return {
            cash: { in: cashIn, out: cashOut, balance: cashIn - cashOut },
            qr: { in: qrIn, out: qrOut, balance: qrIn - qrOut },
            total: { in: cashIn + qrIn, out: cashOut + qrOut, balance: (cashIn + qrIn) - (cashOut + qrOut) }
        };
    },

    // Total expenses for a specific date (used by Sales History to calculate Net Profit)
    getExpensesByDate(date) {
        this.loadData();
        return this.expenses
            .filter(e => e.date === date)
            .reduce((sum, e) => sum + e.amount, 0);
    },

    render() {
        this.loadData();
        const tableBody = document.getElementById('cashflow-table-body');
        if (!tableBody) return;

        const balances = this.calculateBalances();
        
        // Update Dashboard cards
        const cashBalEl = document.getElementById('cashflow-bal-cash');
        const qrBalEl = document.getElementById('cashflow-bal-qr');
        if (cashBalEl) cashBalEl.textContent = window.app.formatter.currency(balances.cash.balance);
        if (qrBalEl) qrBalEl.textContent = window.app.formatter.currency(balances.qr.balance);

        // Build unified ledger (Sales In + Expenses Out)
        let ledger = [];
        
        this.sales.forEach(s => {
            if (s.cash > 0) {
                ledger.push({
                    type: 'in', date: s.date, timestamp: new Date(s.date).getTime(),
                    desc: 'Sales Revenue (Cash)', method: 'Cash', amount: s.cash, id: s.id + '-c'
                });
            }
            if (s.qr > 0) {
                ledger.push({
                    type: 'in', date: s.date, timestamp: new Date(s.date).getTime(),
                    desc: 'Sales Revenue (QR)', method: 'QR', amount: s.qr, id: s.id + '-q'
                });
            }
        });

        this.expenses.forEach(e => {
            ledger.push({
                type: 'out', date: e.date, timestamp: new Date(e.date).getTime(),
                desc: e.note, method: e.paymentMethod, amount: e.amount, id: e.id, rawDate: e.date
            });
        });

        // Filter Ledger
        const filterTypeEl = document.getElementById('cashflow-filter-type');
        const filterType = filterTypeEl ? filterTypeEl.value : 'all';
        const filterDate = document.getElementById('cashflow-filter-date') ? document.getElementById('cashflow-filter-date').value : '';
        const filterMonth = document.getElementById('cashflow-filter-month') ? document.getElementById('cashflow-filter-month').value : '';

        let filteredLedger = ledger.filter(item => {
            if (filterType === 'today') {
                // local date string match
                const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
                return item.date === todayStr || new Date(item.date).toDateString() === new Date().toDateString();
            } else if (filterType === 'date' && filterDate) {
                return item.date === filterDate;
            } else if (filterType === 'month' && filterMonth) {
                return item.date.startsWith(filterMonth);
            }
            return true;
        });

        // Sort descending by date
        filteredLedger.sort((a, b) => b.timestamp - a.timestamp);

        let html = '';
        if (filteredLedger.length === 0) {
            html = '<tr><td colspan="5" style="text-align:center; color: var(--text-secondary); padding: 24px;">No cash flow records found for this period.</td></tr>';
        } else {
            filteredLedger.forEach(item => {
                const isIncome = item.type === 'in';
                const color = isIncome ? 'var(--success-color)' : 'var(--danger-color)';
                const sign = isIncome ? '+' : '-';
                
                let actionBtn = '';
                if (!isIncome) {
                    actionBtn = `<button class="btn-icon" onclick="window.app.cashflow.deleteExpense('${item.id}')"><i class="ph ph-trash" style="color: var(--danger-color);"></i></button>`;
                }

                // Format date to readable string
                const dObj = new Date(item.date);
                const dateStr = !isNaN(dObj) ? dObj.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}) : item.date;

                html += `<tr>
                    <td>${dateStr}</td>
                    <td>${item.desc}</td>
                    <td style="text-align:center;">
                        <span style="font-size: 0.85em; padding: 2px 8px; border-radius: 4px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">${item.method}</span>
                    </td>
                    <td style="text-align:right; font-weight:600; color:${color};">
                        ${sign} ${window.app.formatter.currency(item.amount)}
                    </td>
                    <td style="text-align:center;">${actionBtn}</td>
                </tr>`;
            });
        }
        tableBody.innerHTML = html;
    },

    onFilterChange() {
        const type = document.getElementById('cashflow-filter-type').value;
        const dateInput = document.getElementById('cashflow-filter-date');
        const monthInput = document.getElementById('cashflow-filter-month');
        
        dateInput.style.display = type === 'date' ? 'block' : 'none';
        monthInput.style.display = type === 'month' ? 'block' : 'none';
        
        this.render();
    },

    openModal() {
        const todayDate = new Date();
        const formattedToday = todayDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'});
        
        const html = `
            <div style="margin-bottom: 16px;">
                <label style="display:flex; justify-content:space-between; margin-bottom:5px; font-weight:500;">
                    <span>Date</span>
                    <span id="expense-date-display" style="color:var(--primary-color); font-weight:600;">${formattedToday}</span>
                </label>
                <input type="date" id="expense-form-date" class="form-control" value="${todayDate.toISOString().split('T')[0]}" onchange="
                    const d = new Date(this.value);
                    if(!isNaN(d)) document.getElementById('expense-date-display').textContent = d.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'});
                ">
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display:block; margin-bottom:5px; font-weight:500;">Deskripsi Pengeluaran</label>
                <input type="text" id="expense-form-note" class="form-control" placeholder="Cth: Beli Gas, Lakban, Es Batu, dll">
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display:block; margin-bottom:5px; font-weight:500;">Nominal (Rp)</label>
                <input type="text" id="expense-form-amount" class="form-control" placeholder="0" oninput="window.app.formatter.formatInput(this)">
            </div>
            
            <div style="margin-bottom: 24px;">
                <label style="display:block; margin-bottom:5px; font-weight:500;">Diambil dari Saldo mana?</label>
                <select id="expense-form-method" class="form-control">
                    <option value="Cash">Uang Kasir (Cash)</option>
                    <option value="QR">Saldo Bank (QR)</option>
                </select>
                <small style="color:var(--text-secondary); display:block; margin-top:8px;">
                    Ini akan memotong saldo real-time Anda secara langsung.
                </small>
            </div>
            
            <button class="btn btn-primary" style="width: 100%;" onclick="window.app.cashflow.saveExpense()">Simpan Pengeluaran</button>
        `;
        window.app.modal.open('Catat Pengeluaran Harian', html);
    },

    saveExpense() {
        const date = document.getElementById('expense-form-date').value;
        const note = document.getElementById('expense-form-note').value.trim();
        const amtVal = document.getElementById('expense-form-amount').value;
        const method = document.getElementById('expense-form-method').value;

        if (!date || !note || !amtVal) {
            if(window.Swal) Swal.fire({ icon: 'warning', title: 'Incomplete', text: 'Semua kolom wajib diisi!'});
            return;
        }

        const amount = parseInt(amtVal.replace(/\./g, '')) || 0;
        if (amount <= 0) return;

        const expense = {
            id: window.app.storage.generateId('exp'),
            date,
            note,
            amount,
            paymentMethod: method
        };

        // Fetch latest data to prevent race conditions
        this.expenses = window.app.storage.getDailyExpenses();

        if (this.editId) {
            const index = this.expenses.findIndex(e => e.id === this.editId);
            if (index !== -1) {
                this.expenses[index] = expense;
            } else {
                this.expenses.push(expense);
            }
        } else {
            this.expenses.push(expense);
        }

        window.app.storage.saveDailyExpenses(this.expenses);
        
        if(window.app.modal) window.app.modal.close();
        this.render();
        
        // Also re-render Sales to update Net Profit if Sales page is active
        if(window.app.sales && typeof window.app.sales.render === 'function') {
            window.app.sales.render();
        }

        if(window.Swal) Swal.fire({ icon: 'success', title: 'Tercatat!', text: 'Pengeluaran harian berhasil disimpan.', timer: 1500, showConfirmButton: false });
    },

    deleteExpense(id) {
        if(!window.Swal) return;
        Swal.fire({
            title: 'Hapus Pengeluaran?',
            text: "Saldo akan otomatis dikembalikan.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#fa5252',
            confirmButtonText: 'Ya, hapus!'
        }).then((result) => {
            if (result.isConfirmed) {
                this.expenses = window.app.storage.getDailyExpenses();
                this.expenses = this.expenses.filter(e => e.id !== id);
                window.app.storage.saveDailyExpenses(this.expenses);
                this.render();
                
                // Re-render Sales
                if(window.app.sales && typeof window.app.sales.render === 'function') {
                    window.app.sales.render();
                }
                
                Swal.fire({ icon: 'success', title: 'Dihapus!', timer: 1500, showConfirmButton: false });
            }
        });
    }
};
