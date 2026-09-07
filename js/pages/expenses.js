window.app = window.app || {};

window.app.expenses = {
    data: [],

    init() {
        this.loadData();
    },

    loadData() {
        if (window.app.storage && window.app.storage.getDailyExpenses) {
            this.data = window.app.storage.getDailyExpenses();
        } else {
            const stored = localStorage.getItem('knvi_expenses');
            this.data = stored ? JSON.parse(stored) : [];
        }
    },

    saveData() {
        if (window.app.storage && window.app.storage.saveDailyExpenses) {
            window.app.storage.saveDailyExpenses(this.data);
        } else {
            localStorage.setItem('knvi_expenses', JSON.stringify(this.data));
        }
    },

    normalizeSource(source) {
        if (source === 'Cash') return 'Cash_Today';
        if (source === 'Bank') return 'Bank_Savings';
        return source || 'Cash_Today';
    },

    getSourceLabel(source) {
        const norm = this.normalizeSource(source);
        switch (norm) {
            case 'Cash_Today': return 'Laci Kasir Hari Ini';
            case 'QRIS_Today': return 'Potong QRIS Hari Ini';
            case 'Cash_Savings': return 'Tabungan Cash (Brankas)';
            case 'Bank_Savings': return 'Tabungan QRIS / Bank';
            case 'Restart_Savings': return 'Tabungan Restart (Dana Cair)';
            default: return norm;
        }
    },

    getSourceBadge(source) {
        const norm = this.normalizeSource(source);
        switch (norm) {
            case 'Cash_Today':
                return `<span class="badge" style="background: var(--warning-color); color: #fff;"><i class="ph ph-money"></i> Laci Kasir</span>`;
            case 'QRIS_Today':
                return `<span class="badge" style="background: #20c997; color: #fff;"><i class="ph ph-qr-code"></i> Potong QRIS</span>`;
            case 'Cash_Savings':
                return `<span class="badge" style="background: #e67e22; color: #fff;"><i class="ph ph-vault"></i> Tabungan Cash</span>`;
            case 'Bank_Savings':
                return `<span class="badge" style="background: var(--info-color); color: #fff;"><i class="ph ph-bank"></i> Tabungan Bank</span>`;
            case 'Restart_Savings':
                return `<span class="badge" style="background: #fd7e14; color: #fff;"><i class="ph ph-hand-coins"></i> Tabungan Restart</span>`;
            default:
                return `<span class="badge">${norm}</span>`;
        }
    },

    onFilterChange() {
        const type = document.getElementById('expense-filter-type').value;
        const dateInput = document.getElementById('expense-filter-date');
        const monthInput = document.getElementById('expense-filter-month');

        dateInput.style.display = 'none';
        monthInput.style.display = 'none';

        if (type === 'date') dateInput.style.display = 'block';
        if (type === 'month') monthInput.style.display = 'block';

        this.renderTable();
    },

    getFilteredData() {
        const type = document.getElementById('expense-filter-type')?.value || 'today';
        const dateVal = document.getElementById('expense-filter-date')?.value;
        const monthVal = document.getElementById('expense-filter-month')?.value;

        const now = new Date();
        const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

        return this.data.filter(item => {
            if (type === 'today') {
                return item.date === todayStr;
            } else if (type === 'date' && dateVal) {
                return item.date === dateVal;
            } else if (type === 'month' && monthVal) {
                return item.date.startsWith(monthVal);
            }
            return true; // 'all'
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    renderTable() {
        const tbody = document.getElementById('expense-table-body');
        if (!tbody) return;

        const filtered = this.getFilteredData();
        let totalCashToday = 0;
        let totalQrisToday = 0;
        let totalCashSavings = 0;
        let totalBankSavings = 0;
        let grandTotal = 0;

        tbody.innerHTML = '';

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">Belum ada pengeluaran dicatat.</td></tr>`;
        } else {
            filtered.forEach(item => {
                const norm = this.normalizeSource(item.source);
                if (norm === 'Cash_Today') totalCashToday += item.amount;
                else if (norm === 'QRIS_Today') totalQrisToday += item.amount;
                else if (norm === 'Cash_Savings') totalCashSavings += item.amount;
                else if (norm === 'Bank_Savings') totalBankSavings += item.amount;
                grandTotal += item.amount;

                const sourceBadge = this.getSourceBadge(item.source);

                tbody.innerHTML += `
                    <tr>
                        <td style="text-align: left;">${item.date}</td>
                        <td style="text-align: left; font-weight: 500;">${item.desc}</td>
                        <td style="text-align: center;">${sourceBadge}</td>
                        <td style="text-align: right; font-weight: bold;">${window.app.formatter.currency(item.amount)}</td>
                        <td style="text-align: center;">
                            <button class="btn btn-secondary" onclick="window.app.expenses.openForm('${item.id}')" style="padding: 4px 8px; margin-right: 4px;" title="Edit Pengeluaran"><i class="ph ph-pencil-simple"></i></button>
                            <button class="btn btn-secondary" onclick="window.app.expenses.delete('${item.id}')" style="padding: 4px 8px; color: var(--danger-color);" title="Hapus"><i class="ph ph-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }

        // Update metric display
        const elCash = document.getElementById('expense-total-cash');
        if (elCash) elCash.textContent = window.app.formatter.currency(totalCashToday);

        const elBank = document.getElementById('expense-total-bank');
        if (elBank) elBank.textContent = window.app.formatter.currency(totalBankSavings);

        const elQrisToday = document.getElementById('expense-total-qris-today');
        if (elQrisToday) elQrisToday.textContent = window.app.formatter.currency(totalQrisToday);

        const elCashSavings = document.getElementById('expense-total-cash-savings');
        if (elCashSavings) elCashSavings.textContent = window.app.formatter.currency(totalCashSavings);

        const elGrandTotal = document.getElementById('expense-grand-total');
        if (elGrandTotal) elGrandTotal.textContent = window.app.formatter.currency(grandTotal);
    },

    render() {
        this.loadData();
        this.renderTable();
    },

    openForm(id = null) {
        let item = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            desc: '',
            amount: 0,
            source: 'Cash_Today'
        };

        let isEdit = false;
        if (id) {
            const existing = this.data.find(d => d.id === id);
            if (existing) {
                item = { ...existing };
                item.source = this.normalizeSource(item.source);
                isEdit = true;
            }
        }
        
        const html = `
            <input type="hidden" id="expense-form-id" value="${item.id}">
            <div style="margin-bottom: 12px;">
                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Tanggal</label>
                <input type="date" id="expense-form-date" class="form-control" value="${item.date}" required>
            </div>
            <div style="margin-bottom: 12px;">
                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Keterangan Pengeluaran</label>
                <input type="text" id="expense-form-desc" class="form-control" value="${item.desc || ''}" placeholder="Misal: Beli es batu, sedotan, parkir, bonus staff" required>
            </div>
            <div style="margin-bottom: 12px;">
                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Nominal (Rp)</label>
                <input type="text" id="expense-form-amount" class="form-control" value="${item.amount ? window.app.formatter.number(item.amount) : ''}" oninput="window.app.expenses.formatInput(this)" placeholder="0" required>
            </div>
            <div style="margin-bottom: 24px;">
                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Sumber Dana Pengeluaran</label>
                <select id="expense-form-source" class="form-control" style="font-weight: 500;">
                    <option value="Cash_Today" ${item.source === 'Cash_Today' ? 'selected' : ''}>Potong Omzet Cash Hari Ini (Laci Kasir)</option>
                    <option value="QRIS_Today" ${item.source === 'QRIS_Today' ? 'selected' : ''}>Potong Omzet QRIS Hari Ini</option>
                    <option value="Cash_Savings" ${item.source === 'Cash_Savings' ? 'selected' : ''}>Ambil dari Tabungan Cash (Kas Kemarin / Brankas)</option>
                    <option value="Bank_Savings" ${item.source === 'Bank_Savings' ? 'selected' : ''}>Ambil dari Tabungan QRIS / Bank (Rekening Toko)</option>
                    <option value="Restart_Savings" ${item.source === 'Restart_Savings' ? 'selected' : ''}>Ambil dari Tabungan Restart (Dana 75% Cair)</option>
                </select>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">
                    * Jika memilih "Potong Cash Hari Ini", setoran uang fisik laci kasir hari tersebut akan otomatis berkurang.<br>
                    * Jika memilih "Tabungan Cash/Bank/Restart", saldo tabungan akumulatif toko akan berkurang sesuai sumbernya.
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                <button type="button" class="btn btn-secondary" onclick="window.app.modal.close()">Batal</button>
                <button type="button" class="btn btn-primary" onclick="window.app.expenses.save('${item.id}', ${isEdit})"><i class="ph ph-floppy-disk"></i> ${isEdit ? 'Simpan Perubahan' : 'Simpan Pengeluaran'}</button>
            </div>
        `;

        window.app.modal.open(isEdit ? 'Edit Pengeluaran' : 'Catat Pengeluaran Baru', html, '600px');
    },

    formatInput(el) {
        let val = el.value.replace(/[^0-9]/g, '');
        if (val) {
            el.value = window.app.formatter.number(parseFloat(val));
        } else {
            el.value = '';
        }
    },

    save(id, isEdit = false) {
        const date = document.getElementById('expense-form-date').value;
        const desc = document.getElementById('expense-form-desc').value;
        const amountRaw = document.getElementById('expense-form-amount').value.replace(/[^0-9]/g, '');
        const amount = parseFloat(amountRaw) || 0;
        const source = document.getElementById('expense-form-source').value;

        if (!date || !desc || amount <= 0) {
            if (window.Swal) Swal.fire('Error', 'Semua kolom wajib diisi dengan benar.', 'error');
            return;
        }

        const item = {
            id: id || Date.now().toString(),
            date: date,
            desc: desc,
            amount: amount,
            source: source
        };

        if (isEdit) {
            const idx = this.data.findIndex(d => d.id === id);
            if (idx > -1) {
                this.data[idx] = item;
            } else {
                this.data.push(item);
            }
        } else {
            this.data.push(item);
        }

        this.saveData();
        this.renderTable();
        
        // Auto update daily module if it's currently loaded
        if (window.app.daily) window.app.daily.renderDashboard();
        if (window.app.bonus && window.app.bonus.renderDashboard) window.app.bonus.renderDashboard();
        
        window.app.modal.close();
        if(window.Swal) Swal.fire('Tersimpan', isEdit ? 'Perubahan pengeluaran berhasil disimpan' : 'Pengeluaran berhasil dicatat', 'success');
    },

    delete(id) {
        if(window.Swal) {
            Swal.fire({
                title: 'Hapus pengeluaran?',
                text: "Data ini akan dihapus permanen!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Ya, hapus!'
            }).then((result) => {
                if (result.isConfirmed) {
                    this.data = this.data.filter(d => d.id !== id);
                    this.saveData();
                    this.renderTable();
                    if (window.app.daily) window.app.daily.renderDashboard();
                    if (window.app.bonus && window.app.bonus.renderDashboard) window.app.bonus.renderDashboard();
                    Swal.fire('Terhapus!', 'Data pengeluaran dihapus.', 'success');
                }
            });
        }
    },

    // Utility for daily.js: total cash expenses deducted from drawer TODAY
    getTotalCashExpenseForDate(dateStr) {
        return this.data
            .filter(d => d.date === dateStr && this.normalizeSource(d.source) === 'Cash_Today')
            .reduce((sum, item) => sum + item.amount, 0);
    },

    // Utility for daily.js: total QRIS expenses deducted from today's QRIS
    getTotalQrisExpenseForDate(dateStr) {
        return this.data
            .filter(d => d.date === dateStr && this.normalizeSource(d.source) === 'QRIS_Today')
            .reduce((sum, item) => sum + item.amount, 0);
    },

    // Total expenses taken from accumulated cash savings
    getTotalCashSavingsExpense(upToDate = null) {
        return this.data
            .filter(d => {
                const isSavings = this.normalizeSource(d.source) === 'Cash_Savings';
                if (!isSavings) return false;
                if (upToDate) return d.date <= upToDate;
                return true;
            })
            .reduce((sum, item) => sum + item.amount, 0);
    },

    // Total expenses taken from accumulated bank/QRIS savings
    getTotalBankSavingsExpense(upToDate = null) {
        return this.data
            .filter(d => {
                const isBank = this.normalizeSource(d.source) === 'Bank_Savings';
                if (!isBank) return false;
                if (upToDate) return d.date <= upToDate;
                return true;
            })
            .reduce((sum, item) => sum + item.amount, 0);
    },

    // Total expenses taken from accumulated Restart savings
    getTotalRestartSavingsExpense(upToDate = null) {
        return this.data
            .filter(d => {
                const isRestart = this.normalizeSource(d.source) === 'Restart_Savings';
                if (!isRestart) return false;
                if (upToDate) return d.date <= upToDate;
                return true;
            })
            .reduce((sum, item) => sum + item.amount, 0);
    },

    // Get all expenses for a specific date regardless of source
    getTotalExpenseForDate(dateStr) {
        return this.data
            .filter(d => d.date === dateStr)
            .reduce((sum, item) => sum + item.amount, 0);
    },

    getCashExpenseDescriptionsForDate(dateStr) {
        return this.data
            .filter(d => d.date === dateStr && this.normalizeSource(d.source) === 'Cash_Today')
            .map(d => d.desc)
            .join(', ');
    }
};
