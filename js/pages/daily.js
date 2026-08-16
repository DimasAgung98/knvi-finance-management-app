window.app = window.app || {};

window.app.daily = {
    data: [],
    
    init() {
        this.loadData();
        this.renderDashboard();
    },

    loadData() {
        const stored = localStorage.getItem('knvi_daily_records');
        if (stored) {
            this.data = JSON.parse(stored);
        } else {
            this.data = [];
        }
    },

    saveData() {
        localStorage.setItem('knvi_daily_records', JSON.stringify(this.data));
    },

    onFilterChange() {
        const type = document.getElementById('daily-filter-type').value;
        const dateInput = document.getElementById('daily-filter-date');
        const monthInput = document.getElementById('daily-filter-month');

        dateInput.style.display = 'none';
        monthInput.style.display = 'none';

        if (type === 'date') dateInput.style.display = 'block';
        if (type === 'month') monthInput.style.display = 'block';

        this.renderDashboard();
    },

    getFilteredData() {
        const type = document.getElementById('daily-filter-type')?.value || 'all';
        const dateVal = document.getElementById('daily-filter-date')?.value;
        const monthVal = document.getElementById('daily-filter-month')?.value;

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

    renderDashboard() {
        const tbody = document.getElementById('daily-table-body');
        if (!tbody) return;

        const filtered = this.getFilteredData();
        
        let totalOmzet = 0;
        let totalCash = 0;
        let totalQRIS = 0;
        let totalKasKecil = 0;
        let totalRestartShare = 0;
        let totalShortage = 0;

        tbody.innerHTML = '';
        
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 24px;">Belum ada rekap harian</td></tr>`;
        } else {
            filtered.forEach(item => {
                const omzet = (item.kanovi || 0) + (item.restart || 0); // kanovi is total loyverse
                const kasKecil = window.app.expenses ? window.app.expenses.getTotalCashExpenseForDate(item.date) : (item.kasKecil || 0);
                const kasKecilDesc = window.app.expenses ? window.app.expenses.getCashExpenseDescriptionsForDate(item.date) : '';
                
                // Restart money is not in drawer immediately
                const setoranHarusnya = (item.cash || 0) - kasKecil;
                const setoranAktual = item.actualCash !== undefined ? item.actualCash : setoranHarusnya;
                const shortage = setoranAktual - setoranHarusnya;

                const restartShare = (item.restart || 0) * 0.25;

                totalOmzet += omzet;
                totalCash += setoranAktual; // Total fisik yg disetor
                totalQRIS += (item.qris || 0);
                totalKasKecil += kasKecil;
                totalRestartShare += restartShare;
                totalShortage += shortage;

                tbody.innerHTML += `
                    <tr>
                        <td style="text-align: left;">${item.date}</td>
                        <td style="text-align: right;">${window.app.formatter.currency(item.cash || 0)}</td>
                        <td style="text-align: right;">${window.app.formatter.currency(item.qris || 0)}</td>
                        <td style="text-align: right;">${window.app.formatter.currency(item.kanovi || 0)}</td>
                        <td style="text-align: right;">${window.app.formatter.currency(item.restart || 0)}</td>
                        <td style="text-align: right; color: var(--warning-color);">
                            ${window.app.formatter.currency(kasKecil)}
                            ${kasKecilDesc ? `<div style="font-size: 0.75em; color: var(--text-muted); max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${kasKecilDesc}">${kasKecilDesc}</div>` : ''}
                        </td>
                        <td style="text-align: right; color: ${shortage < 0 ? 'var(--danger-color)' : 'var(--success-color)'}; font-weight: bold;">${window.app.formatter.currency(setoranAktual)}</td>
                        <td style="text-align: right; color: ${shortage < 0 ? 'var(--danger-color)' : (shortage > 0 ? 'var(--success-color)' : 'var(--text-muted)')};">${window.app.formatter.currency(shortage)}</td>
                        <td style="text-align: center;">
                            <button class="btn btn-secondary" onclick="window.app.daily.openForm('${item.id}')" style="padding: 4px 8px;"><i class="ph ph-pencil-simple"></i></button>
                            <button class="btn btn-secondary" onclick="window.app.daily.delete('${item.id}')" style="padding: 4px 8px; color: var(--danger-color);"><i class="ph ph-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }

        document.getElementById('daily-dash-omzet').textContent = window.app.formatter.currency(totalOmzet);
        document.getElementById('daily-dash-cash').textContent = window.app.formatter.currency(totalCash);
        document.getElementById('daily-dash-qris').textContent = window.app.formatter.currency(totalQRIS);
        
        const shortageEl = document.getElementById('daily-dash-shortage');
        shortageEl.textContent = window.app.formatter.currency(totalShortage);
        if (totalShortage < 0) {
            shortageEl.style.color = 'var(--danger-color)';
        } else if (totalShortage > 0) {
            shortageEl.style.color = 'var(--success-color)';
        } else {
            shortageEl.style.color = 'var(--text-muted)';
        }

        document.getElementById('daily-dash-kaskecil').textContent = window.app.formatter.currency(totalKasKecil);
        document.getElementById('daily-dash-restart-cut').textContent = window.app.formatter.currency(totalRestartShare);

        this.renderExpenses();
    },

    renderExpenses() {
        const tbody = document.getElementById('daily-expenses-table-body');
        if (!tbody || !window.app.expenses) return;

        const type = document.getElementById('daily-filter-type')?.value || 'all';
        const dateVal = document.getElementById('daily-filter-date')?.value;
        const monthVal = document.getElementById('daily-filter-month')?.value;

        const now = new Date();
        const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

        let filtered = window.app.expenses.data.filter(item => {
            if (type === 'today') {
                return item.date === todayStr;
            } else if (type === 'date' && dateVal) {
                return item.date === dateVal;
            } else if (type === 'month' && monthVal) {
                return item.date.startsWith(monthVal);
            }
            return true; // 'all'
        }).sort((a, b) => new Date(b.date) - new Date(a.date));

        tbody.innerHTML = '';

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 24px;">Tidak ada pengeluaran di periode ini.</td></tr>`;
        } else {
            filtered.forEach(item => {
                let sourceBadge = item.source === 'Cash' 
                    ? `<span class="badge" style="background: var(--warning-color); color: #fff;">Laci Kasir</span>`
                    : `<span class="badge" style="background: var(--info-color); color: #fff;">Bank/Transfer</span>`;

                tbody.innerHTML += `
                    <tr>
                        <td style="text-align: left;">${item.date}</td>
                        <td style="text-align: left; font-weight: 500;">${item.desc}</td>
                        <td style="text-align: center;">${sourceBadge}</td>
                        <td style="text-align: right; font-weight: bold;">${window.app.formatter.currency(item.amount)}</td>
                    </tr>
                `;
            });
        }
    },

    render() {
        this.renderDashboard();
    },

    openForm(id = null) {
        let item = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            cash: 0,
            qris: 0,
            kanovi: 0,
            restart: 0,
            actualCash: 0
        };

        let isEdit = false;
        if (id) {
            const existing = this.data.find(d => d.id === id);
            if (existing) {
                item = { ...existing };
                isEdit = true;
            }
        }

        const kasKecil = window.app.expenses ? window.app.expenses.getTotalCashExpenseForDate(item.date) : 0;
        const setoranHarusnya = (item.cash || 0) - kasKecil;

        const html = `
            <div class="dashboard-grid" style="gap: 16px;">
                <div>
                    <h4 style="margin-bottom: 12px; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Rincian Omzet per Brand</h4>
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; font-weight: 500; margin-bottom: 4px;">Tanggal</label>
                        <input type="date" id="daily-form-date" class="form-control" value="${item.date}" onchange="window.app.daily.onDateChange()" required>
                    </div>
                    <div style="margin-bottom: 12px; background: var(--bg-surface); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                        <strong style="color: var(--primary-color);">Kanovi (Loyverse)</strong>
                        <div style="margin-top: 8px;">
                            <label style="display: block; font-size: 0.85rem; margin-bottom: 4px;">Omzet Cash (Loyverse)</label>
                            <input type="text" id="daily-form-cash" class="form-control" value="${window.app.formatter.number(item.cash)}" oninput="window.app.daily.formatInput(this); window.app.daily.calculateForm()" placeholder="0">
                        </div>
                        <div style="margin-top: 8px;">
                            <label style="display: block; font-size: 0.85rem; margin-bottom: 4px;">Omzet QRIS (Loyverse)</label>
                            <input type="text" id="daily-form-qris" class="form-control" value="${window.app.formatter.number(item.qris)}" oninput="window.app.daily.formatInput(this); window.app.daily.calculateForm()" placeholder="0">
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 12px; background: var(--bg-surface); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                        <strong style="color: var(--primary-color);">Restart (Luar Loyverse)</strong>
                        <div style="margin-top: 8px;">
                            <label style="display: block; font-size: 0.85rem; margin-bottom: 4px;">Omzet Restart (Tunai)</label>
                            <input type="text" id="daily-form-restart" class="form-control" value="${window.app.formatter.number(item.restart)}" oninput="window.app.daily.formatInput(this); window.app.daily.calculateForm()" placeholder="0">
                            <small style="color: var(--text-muted); display: block; margin-top: 4px;">Bagi Hasil: Kanovi 75%, Restart 25%</small>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 style="margin-bottom: 12px; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Pengeluaran (Kas Kecil)</h4>
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; font-weight: 500; margin-bottom: 4px;">Total Kas Kecil (Auto)</label>
                        <input type="text" id="daily-form-kaskecil" class="form-control" value="${window.app.formatter.number(kasKecil)}" disabled style="background: var(--bg-surface);">
                        <small style="color: var(--text-muted);">Terintegrasi otomatis dari menu Pengeluaran Harian di tanggal yang dipilih.</small>
                    </div>

                    <h4 style="margin-top: 24px; margin-bottom: 12px; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Rekonsiliasi Uang Fisik</h4>
                    
                    <div style="background: var(--bg-surface); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-bottom: 12px;">
                        <div style="font-size: 0.85em; color: var(--text-muted);">Uang Cash Seharusnya di Laci</div>
                        <div style="font-weight: bold; font-size: 1.2em;" id="daily-form-expected">Rp 0</div>
                        <div style="font-size: 0.8em; color: var(--text-muted);">Rumus: Cash Loyverse - Kas Kecil (Omzet Restart cair H+1)</div>
                    </div>

                    <div style="margin-bottom: 12px;">
                        <label style="display: block; font-weight: 500; margin-bottom: 4px; color: var(--primary-color);">Uang Fisik Aktual di Laci</label>
                        <input type="text" id="daily-form-actual" class="form-control" value="${window.app.formatter.number(isEdit ? item.actualCash : setoranHarusnya)}" oninput="window.app.daily.formatInput(this); window.app.daily.calculateForm()" placeholder="0" style="font-size: 1.2em; font-weight: bold;">
                    </div>

                    <div style="background: var(--bg-surface); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 500;">Selisih/Minus Kasir:</span>
                        <span style="font-weight: bold; font-size: 1.2em;" id="daily-form-diff">Rp 0</span>
                    </div>
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                <button type="button" class="btn btn-secondary" onclick="window.app.modal.close()">Batal</button>
                <button type="button" class="btn btn-primary" onclick="window.app.daily.save('${item.id}')"><i class="ph ph-floppy-disk"></i> Simpan Rekap</button>
            </div>
        `;

        window.app.modal.open(isEdit ? 'Edit Rekap Harian' : 'Buat Rekap Harian', html);
        setTimeout(() => this.calculateForm(), 100);
    },

    onDateChange() {
        const dateStr = document.getElementById('daily-form-date').value;
        if (dateStr && window.app.expenses) {
            const kasKecil = window.app.expenses.getTotalCashExpenseForDate(dateStr);
            document.getElementById('daily-form-kaskecil').value = window.app.formatter.number(kasKecil);
            this.calculateForm();
        }
    },

    formatInput(el) {
        let val = el.value.replace(/[^0-9]/g, '');
        if (val) {
            el.value = window.app.formatter.number(parseFloat(val));
        } else {
            el.value = '';
        }
    },

    getVal(id) {
        const el = document.getElementById(id);
        if (!el) return 0;
        return parseFloat(el.value.replace(/[^0-9]/g, '')) || 0;
    },

    calculateForm() {
        const cash = this.getVal('daily-form-cash');
        const qris = this.getVal('daily-form-qris');
        const restart = this.getVal('daily-form-restart');
        const kasKecil = this.getVal('daily-form-kaskecil');
        const actual = this.getVal('daily-form-actual');

        // Total Kanovi Omzet = Cash Loyverse + QRIS Loyverse
        const kanovi = cash + qris;

        const expected = cash - kasKecil;
        const diff = actual - expected;

        document.getElementById('daily-form-expected').textContent = window.app.formatter.currency(expected);
        
        const diffEl = document.getElementById('daily-form-diff');
        diffEl.textContent = window.app.formatter.currency(diff);
        if (diff < 0) {
            diffEl.style.color = 'var(--danger-color)';
        } else if (diff > 0) {
            diffEl.style.color = 'var(--success-color)';
        } else {
            diffEl.style.color = 'var(--text-main)';
        }
    },

    save(id) {
        const date = document.getElementById('daily-form-date').value;
        if (!date) {
            if(window.Swal) Swal.fire('Error', 'Tanggal wajib diisi', 'error');
            return;
        }

        const cash = this.getVal('daily-form-cash');
        const qris = this.getVal('daily-form-qris');
        
        const item = {
            id: id,
            date: date,
            cash: cash,
            qris: qris,
            kanovi: cash + qris, // Kanovi is total of Loyverse
            restart: this.getVal('daily-form-restart'),
            actualCash: this.getVal('daily-form-actual')
        };

        const existingIndex = this.data.findIndex(d => d.id === id);
        if (existingIndex > -1) {
            this.data[existingIndex] = item;
        } else {
            this.data.push(item);
        }

        this.saveData();
        this.renderDashboard();
        window.app.modal.close();
        if(window.Swal) Swal.fire('Tersimpan', 'Rekap harian berhasil disimpan', 'success');
    },

    delete(id) {
        if(window.Swal) {
            Swal.fire({
                title: 'Hapus rekap?',
                text: "Data ini tidak bisa dikembalikan!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Ya, hapus!'
            }).then((result) => {
                if (result.isConfirmed) {
                    this.data = this.data.filter(d => d.id !== id);
                    this.saveData();
                    this.renderDashboard();
                    Swal.fire('Terhapus!', 'Data rekap dihapus.', 'success');
                }
            });
        }
    }
};
