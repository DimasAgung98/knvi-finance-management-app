window.app = window.app || {};

window.app.expenses = {
    data: [],

    init() {
        this.loadData();
    },

    loadData() {
        const stored = localStorage.getItem('knvi_expenses');
        if (stored) {
            this.data = JSON.parse(stored);
        } else {
            this.data = [];
        }
    },

    saveData() {
        localStorage.setItem('knvi_expenses', JSON.stringify(this.data));
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

        return this.data.filter(item => {
            const itemDate = new Date(item.date);
            const today = new Date();

            if (type === 'today') {
                return itemDate.toDateString() === today.toDateString();
            } else if (type === 'date' && dateVal) {
                return item.date === dateVal;
            } else if (type === 'month' && monthVal) {
                const itemMonth = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
                return itemMonth === monthVal;
            }
            return true; // 'all'
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    renderTable() {
        const tbody = document.getElementById('expense-table-body');
        if (!tbody) return;

        const filtered = this.getFilteredData();
        let totalCash = 0;
        let totalBank = 0;

        tbody.innerHTML = '';

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">Belum ada pengeluaran dicatat.</td></tr>`;
        } else {
            filtered.forEach(item => {
                if (item.source === 'Cash') totalCash += item.amount;
                else totalBank += item.amount;

                let sourceBadge = item.source === 'Cash' 
                    ? `<span class="badge" style="background: var(--warning-color); color: #fff;">Laci Kasir (Cash)</span>`
                    : `<span class="badge" style="background: var(--info-color); color: #fff;">Tabungan/Transfer</span>`;

                tbody.innerHTML += `
                    <tr>
                        <td style="text-align: left;">${item.date}</td>
                        <td style="text-align: left; font-weight: 500;">${item.desc}</td>
                        <td style="text-align: center;">${sourceBadge}</td>
                        <td style="text-align: right; font-weight: bold;">${window.app.formatter.currency(item.amount)}</td>
                        <td style="text-align: center;">
                            <button class="btn btn-secondary" onclick="window.app.expenses.delete('${item.id}')" style="padding: 4px 8px; color: var(--danger-color);"><i class="ph ph-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }

        document.getElementById('expense-total-cash').textContent = window.app.formatter.currency(totalCash);
        document.getElementById('expense-total-bank').textContent = window.app.formatter.currency(totalBank);
    },

    render() {
        this.renderTable();
    },

    openForm() {
        const today = new Date().toISOString().split('T')[0];
        
        const html = `
            <div style="margin-bottom: 12px;">
                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Tanggal</label>
                <input type="date" id="expense-form-date" class="form-control" value="${today}" required>
            </div>
            <div style="margin-bottom: 12px;">
                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Keterangan Pengeluaran</label>
                <input type="text" id="expense-form-desc" class="form-control" placeholder="Misal: Beli es batu, sedotan, parkir" required>
            </div>
            <div style="margin-bottom: 12px;">
                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Nominal (Rp)</label>
                <input type="text" id="expense-form-amount" class="form-control" oninput="window.app.expenses.formatInput(this)" placeholder="0" required>
            </div>
            <div style="margin-bottom: 24px;">
                <label style="display: block; font-weight: 500; margin-bottom: 4px;">Sumber Dana</label>
                <select id="expense-form-source" class="form-control">
                    <option value="Cash">Ambil dari Laci Kasir (Memotong Setoran Cash)</option>
                    <option value="Bank">Transfer / QRIS / Tabungan</option>
                </select>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                <button type="button" class="btn btn-secondary" onclick="window.app.modal.close()">Batal</button>
                <button type="button" class="btn btn-primary" onclick="window.app.expenses.save()"><i class="ph ph-floppy-disk"></i> Simpan Pengeluaran</button>
            </div>
        `;

        window.app.modal.open('Catat Pengeluaran Baru', html);
    },

    formatInput(el) {
        let val = el.value.replace(/[^0-9]/g, '');
        if (val) {
            el.value = window.app.formatter.number(parseFloat(val));
        } else {
            el.value = '';
        }
    },

    save() {
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
            id: Date.now().toString(),
            date: date,
            desc: desc,
            amount: amount,
            source: source
        };

        this.data.push(item);
        this.saveData();
        this.renderTable();
        
        // Auto update daily module if it's currently loaded
        if (window.app.daily) window.app.daily.renderDashboard();
        
        window.app.modal.close();
        if(window.Swal) Swal.fire('Tersimpan', 'Pengeluaran berhasil dicatat', 'success');
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
                    Swal.fire('Terhapus!', 'Data pengeluaran dihapus.', 'success');
                }
            });
        }
    },

    // Utility function for daily.js to get total cash expenses for a specific date
    getTotalCashExpenseForDate(dateStr) {
        return this.data
            .filter(d => d.date === dateStr && d.source === 'Cash')
            .reduce((sum, item) => sum + item.amount, 0);
    },

    getCashExpenseDescriptionsForDate(dateStr) {
        return this.data
            .filter(d => d.date === dateStr && d.source === 'Cash')
            .map(d => d.desc)
            .join(', ');
    }
};
