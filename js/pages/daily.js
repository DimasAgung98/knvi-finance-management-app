window.app = window.app || {};

window.app.daily = {
    data: [],
    
    init() {
        this.loadData();
        this.renderDashboard();
    },

    loadData() {
        if (window.app.storage && window.app.storage.getDailyRecords) {
            this.data = window.app.storage.getDailyRecords();
        } else {
            const stored = localStorage.getItem('knvi_daily_records');
            this.data = stored ? JSON.parse(stored) : [];
        }
    },

    saveData() {
        if (window.app.storage && window.app.storage.saveDailyRecords) {
            window.app.storage.saveDailyRecords(this.data);
        } else {
            localStorage.setItem('knvi_daily_records', JSON.stringify(this.data));
        }
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
        if (window.app.expenses && window.app.expenses.loadData) {
            window.app.expenses.loadData();
        }
        const tbody = document.getElementById('daily-table-body');
        if (!tbody) return;

        const filtered = this.getFilteredData();
        
        let totalOmzet = 0;
        let totalKanovi = 0;
        let totalRestart = 0;
        let totalCash = 0;
        let totalQRIS = 0;
        let totalKasKecil = 0;
        let totalRestartShare = 0; // 25% dari restart
        let totalRestart75 = 0;    // 75% dari restart
        let totalKanoviShare = 0;  // kanovi + 75% restart
        let totalShortage = 0;

        tbody.innerHTML = '';
        
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 24px;">Belum ada rekap harian</td></tr>`;
        } else {
            filtered.forEach(item => {
                const kanoviOmzet = item.kanovi || (item.cash || 0) + (item.qris || 0);
                const restartOmzet = item.restart || 0;
                const omzet = kanoviOmzet + restartOmzet;
                const kasKecil = window.app.expenses ? window.app.expenses.getTotalCashExpenseForDate(item.date) : (item.kasKecil || 0);
                const kasKecilDesc = window.app.expenses ? window.app.expenses.getCashExpenseDescriptionsForDate(item.date) : '';
                
                const setoranHarusnya = (item.cash || 0) - kasKecil;
                const setoranAktual = item.actualCash !== undefined ? item.actualCash : setoranHarusnya;
                const shortage = setoranAktual - setoranHarusnya;

                const restartShare = Math.round(restartOmzet * 0.25);
                const restart75 = Math.round(restartOmzet * 0.75);
                const kanoviShare = kanoviOmzet + restart75;

                totalOmzet += omzet;
                totalKanovi += kanoviOmzet;
                totalRestart += restartOmzet;
                totalCash += setoranAktual; // Total fisik yg disetor
                totalQRIS += (item.qris || 0);
                totalKasKecil += kasKecil;
                totalRestartShare += restartShare;
                totalRestart75 += restart75;
                totalKanoviShare += kanoviShare;
                totalShortage += shortage;

                tbody.innerHTML += `
                    <tr>
                        <td style="text-align: left;">${item.date}</td>
                        <td style="text-align: right;">${window.app.formatter.currency(item.cash || 0)}</td>
                        <td style="text-align: right;">${window.app.formatter.currency(item.qris || 0)}</td>
                        <td style="text-align: right;">
                            ${window.app.formatter.currency(kanoviOmzet)}
                            ${restart75 > 0 ? `<div style="font-size: 0.7em; color: #8e44ad;" title="Omzet Kanovi + 75% Restart (+${window.app.formatter.currency(restart75)})">+75% R: ${window.app.formatter.currency(kanoviShare)}</div>` : ''}
                        </td>
                        <td style="text-align: right;">
                            ${window.app.formatter.currency(restartOmzet)}
                            ${restartOmzet > 0 ? `<div style="font-size: 0.7em; color: var(--text-muted);" title="25% Hak Restart: ${window.app.formatter.currency(restartShare)} | 75% Hak Kanovi: ${window.app.formatter.currency(restart75)}">25%: ${window.app.formatter.currency(restartShare)}</div>` : ''}
                        </td>
                        <td style="text-align: right; font-weight: bold; color: var(--primary-color);">${window.app.formatter.currency(omzet)}</td>
                        <td style="text-align: right; color: var(--warning-color);">
                            ${window.app.formatter.currency(kasKecil)}
                            ${kasKecilDesc ? `<div style="font-size: 0.75em; color: var(--text-muted); max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${kasKecilDesc}">${kasKecilDesc}</div>` : ''}
                        </td>
                        <td style="text-align: right; color: ${shortage < 0 ? 'var(--danger-color)' : 'var(--success-color)'}; font-weight: bold;">${window.app.formatter.currency(setoranAktual)}</td>
                        <td style="text-align: right; color: ${shortage < 0 ? 'var(--danger-color)' : (shortage > 0 ? 'var(--success-color)' : 'var(--text-muted)')};">${window.app.formatter.currency(shortage)}</td>
                        <td style="text-align: center;">
                            <button class="btn btn-secondary" onclick="window.app.daily.openForm('${item.id}')" style="padding: 4px 8px;" title="Edit Rekap"><i class="ph ph-pencil-simple"></i></button>
                            <button class="btn btn-secondary" onclick="window.app.daily.delete('${item.id}')" style="padding: 4px 8px; color: var(--danger-color);" title="Hapus"><i class="ph ph-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }

        // Calculate all-time savings balances (Tabungan CASH & Tabungan QRIS/Bank)
        let allTimeCashSetor = 0;
        let allTimeQrisReceived = 0;

        this.data.forEach(item => {
            const kasKecil = window.app.expenses ? window.app.expenses.getTotalCashExpenseForDate(item.date) : (item.kasKecil || 0);
            const setoranHarusnya = (item.cash || 0) - kasKecil;
            const setoranAktual = item.actualCash !== undefined ? item.actualCash : setoranHarusnya;
            allTimeCashSetor += setoranAktual;
            allTimeQrisReceived += (item.qris || 0);
        });

        const allTimeCashSavingsExpense = window.app.expenses ? window.app.expenses.getTotalCashSavingsExpense() : 0;
        const allTimeBankSavingsExpense = window.app.expenses ? window.app.expenses.getTotalBankSavingsExpense() : 0;
        const allTimeQrisTodayExpense = window.app.expenses 
            ? window.app.expenses.data.filter(e => window.app.expenses.normalizeSource(e.source) === 'QRIS_Today').reduce((s, e) => s + e.amount, 0)
            : 0;

        const saldoTabunganCash = allTimeCashSetor - allTimeCashSavingsExpense;
        const saldoTabunganBank = allTimeQrisReceived - (allTimeBankSavingsExpense + allTimeQrisTodayExpense);

        // Filtered total expenses
        const filteredExpenses = this.getFilteredExpenses();
        const totalFilteredExpenses = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);

        // Update DOM elements
        const setEl = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setEl('daily-dash-omzet', window.app.formatter.currency(totalOmzet));
        setEl('daily-dash-kanovi', window.app.formatter.currency(totalKanovi));
        setEl('daily-dash-restart', window.app.formatter.currency(totalRestart));
        setEl('daily-dash-kanovi-share', window.app.formatter.currency(totalKanoviShare));
        setEl('daily-dash-restart-cut', window.app.formatter.currency(totalRestartShare));

        // Detail Rincian Bagi Hasil Kanovi (Omzet KNVI + 75% Restart)
        setEl('daily-dash-kanovi-base', window.app.formatter.currency(totalKanovi));
        setEl('daily-dash-restart-75', '+ ' + window.app.formatter.currency(totalRestart75));
        const formulaEl = document.getElementById('daily-dash-kanovi-formula');
        if (formulaEl) {
            formulaEl.textContent = `${window.app.formatter.currency(totalKanovi)} + ${window.app.formatter.currency(totalRestart75)} = ${window.app.formatter.currency(totalKanoviShare)}`;
        }

        // Detail Rincian Bagi Hasil Restart (25% Hak Restart & 75% Kanovi)
        setEl('daily-dash-restart-total-detail', window.app.formatter.currency(totalRestart));
        setEl('daily-dash-restart-25-sub', window.app.formatter.currency(totalRestartShare));
        setEl('daily-dash-restart-75-sub', window.app.formatter.currency(totalRestart75));
        setEl('daily-dash-total-expense', window.app.formatter.currency(totalFilteredExpenses));
        setEl('daily-dash-cash-savings', window.app.formatter.currency(saldoTabunganCash));
        setEl('daily-dash-bank-savings', window.app.formatter.currency(saldoTabunganBank));
        setEl('daily-dash-kaskecil', window.app.formatter.currency(totalKasKecil));

        const shortageEl = document.getElementById('daily-dash-shortage');
        if (shortageEl) {
            shortageEl.textContent = window.app.formatter.currency(totalShortage);
            if (totalShortage < 0) {
                shortageEl.style.color = 'var(--danger-color)';
            } else if (totalShortage > 0) {
                shortageEl.style.color = 'var(--success-color)';
            } else {
                shortageEl.style.color = 'var(--text-muted)';
            }
        }

        this.renderExpenses();
    },

    getFilteredExpenses() {
        if (!window.app.expenses) return [];
        const type = document.getElementById('daily-filter-type')?.value || 'all';
        const dateVal = document.getElementById('daily-filter-date')?.value;
        const monthVal = document.getElementById('daily-filter-month')?.value;

        const now = new Date();
        const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

        return window.app.expenses.data.filter(item => {
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

    renderExpenses() {
        const tbody = document.getElementById('daily-expenses-table-body');
        if (!tbody || !window.app.expenses) return;

        const filtered = this.getFilteredExpenses();
        tbody.innerHTML = '';

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 24px;">Tidak ada pengeluaran di periode ini.</td></tr>`;
        } else {
            filtered.forEach(item => {
                const sourceBadge = window.app.expenses.getSourceBadge 
                    ? window.app.expenses.getSourceBadge(item.source)
                    : `<span class="badge">${item.source}</span>`;

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
        this.loadData();
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
        const totalExpense = window.app.expenses ? window.app.expenses.getTotalExpenseForDate(item.date) : 0;
        const setoranHarusnya = (item.cash || 0) - kasKecil;

        const html = `
            <div class="dashboard-grid" style="gap: 16px;">
                <div>
                    <h4 style="margin-bottom: 12px; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Rincian Omzet per Brand</h4>
                    <div style="margin-bottom: 12px;">
                        <input type="hidden" id="daily-form-id" value="${item.id}">
                        <label style="display: block; font-weight: 500; margin-bottom: 4px;">Tanggal</label>
                        <input type="date" id="daily-form-date" class="form-control" value="${item.date}" onchange="window.app.daily.onDateChange()">
                    </div>

                    <div style="margin-bottom: 16px;">
                        <h5 style="color: var(--warning-color); margin-bottom: 8px;">Kanovi (Loyverse)</h5>
                        <div style="margin-bottom: 8px;">
                            <label>Omzet Cash (Loyverse)</label>
                            <input type="text" id="daily-form-cash" class="form-control" value="${window.app.formatter.number(item.cash || 0)}" oninput="window.app.daily.formatInput(this); window.app.daily.calculateForm()" placeholder="0">
                        </div>
                        <div>
                            <label>Omzet QRIS (Loyverse)</label>
                            <input type="text" id="daily-form-qris" class="form-control" value="${window.app.formatter.number(item.qris || 0)}" oninput="window.app.daily.formatInput(this); window.app.daily.calculateForm()" placeholder="0">
                        </div>
                    </div>

                    <div style="margin-bottom: 16px;">
                        <h5 style="color: var(--warning-color); margin-bottom: 8px;">Restart (Luar Loyverse)</h5>
                        <div style="margin-bottom: 4px;">
                            <label>Omzet Restart (Tunai)</label>
                            <input type="text" id="daily-form-restart" class="form-control" value="${window.app.formatter.number(item.restart || 0)}" oninput="window.app.daily.formatInput(this); window.app.daily.calculateForm()" placeholder="0">
                        </div>
                        <div style="font-size: 0.8em; color: var(--text-muted); margin-bottom: 8px;">Bagi Hasil: Kanovi 75%, Restart 25%</div>
                        <div id="daily-form-restart-breakdown" style="background: var(--bg-surface); padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.82rem;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span style="color: var(--text-secondary);">75% Bagian Kanovi:</span>
                                <strong id="daily-form-restart-75" style="color: #8e44ad;">Rp 0</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span style="color: var(--text-secondary);">25% Bagian Restart:</span>
                                <strong id="daily-form-restart-25" style="color: #e03131;">Rp 0</strong>
                            </div>
                            <div style="border-top: 1px dashed var(--border-color); margin-top: 6px; padding-top: 6px; color: var(--text-muted); font-size: 0.75rem;" id="daily-form-kanovi-total-formula">
                                Total Omzet Kanovi: Rp 0 + Rp 0 = Rp 0
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 style="margin-bottom: 12px; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Informasi Pengeluaran</h4>
                    <div style="margin-bottom: 12px;">
                        <div style="margin-bottom: 16px;">
                        <label>Total Pengeluaran Hari Ini</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="daily-form-total-expense" class="form-control" value="${window.app.formatter.number(totalExpense)}" disabled style="background: var(--bg-body); opacity: 0.8; flex: 1;">
                            <button type="button" class="btn btn-secondary" onclick="window.app.daily.showExpenseDetails()" style="white-space: nowrap;"><i class="ph ph-info"></i> Detail</button>
                        </div>
                        <div style="font-size: 0.8em; color: var(--text-muted); margin-top: 4px;">Termasuk Cash Laci & Transfer Bank.</div>
                        </div>

                        <div style="margin-bottom: 16px;">
                        <label>Dipotong dari Laci (Kas Kecil)</label>
                        <input type="text" id="daily-form-kaskecil" class="form-control" value="${window.app.formatter.number(kasKecil)}" disabled style="background: var(--bg-surface); opacity: 0.8; flex: 1;">
                        <div style="font-size: 0.8em; color: var(--text-muted); margin-top: 4px;">Nominal ini otomatis mengurangi Setoran Laci Kasir.</div>
                        </div>
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

        window.app.modal.open(isEdit ? 'Edit Rekap Harian' : 'Buat Rekap Harian', html, '800px');
        setTimeout(() => this.calculateForm(), 100);
    },

    onDateChange() {
        const dateStr = document.getElementById('daily-form-date').value;
        if (dateStr && window.app.expenses) {
            const kasKecil = window.app.expenses.getTotalCashExpenseForDate(dateStr);
            const totalExpense = window.app.expenses.getTotalExpenseForDate(dateStr);
            document.getElementById('daily-form-kaskecil').value = window.app.formatter.number(kasKecil);
            const expenseInput = document.getElementById('daily-form-total-expense');
            if (expenseInput) expenseInput.value = window.app.formatter.number(totalExpense);
            this.calculateForm();
        }
    },

    showExpenseDetails() {
        const dateStr = document.getElementById('daily-form-date')?.value;
        if (!dateStr || !window.app.expenses) return;
        
        const expenses = window.app.expenses.data.filter(d => d.date === dateStr);
        let html = '';
        if (expenses.length === 0) {
            html = '<p style="color: var(--text-muted); margin-top: 20px;">Tidak ada pengeluaran di tanggal ini.</p>';
        } else {
            html = `
            <table class="excel-table" style="width: 100%; text-align: left; margin-top: 16px;">
                <thead>
                    <tr>
                        <th>Keterangan</th>
                        <th style="text-align: center;">Sumber</th>
                        <th style="text-align: right;">Nominal</th>
                    </tr>
                </thead>
                <tbody>
                    ${expenses.map(e => {
                        const sourceBadge = window.app.expenses.getSourceBadge 
                            ? window.app.expenses.getSourceBadge(e.source)
                            : `<span class="badge">${e.source}</span>`;
                        return `
                    <tr>
                        <td>${e.desc}</td>
                        <td style="text-align: center;">${sourceBadge}</td>
                        <td style="text-align: right;">${window.app.formatter.currency(e.amount)}</td>
                    </tr>
                    `}).join('')}
                </tbody>
            </table>
            `;
        }
        
        Swal.fire({
            title: `Rincian Pengeluaran`,
            html: html,
            width: '400px',
            confirmButtonText: 'Tutup'
        });
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
        const restart75 = Math.round(restart * 0.75);
        const restart25 = Math.round(restart * 0.25);
        const kanoviTotalShare = kanovi + restart75;

        const expected = cash - kasKecil;
        const diff = actual - expected;

        const elExpected = document.getElementById('daily-form-expected');
        if (elExpected) elExpected.textContent = window.app.formatter.currency(expected);

        // Update live breakdown Restart & Bagi Hasil dalam modal
        const elR75 = document.getElementById('daily-form-restart-75');
        if (elR75) elR75.textContent = window.app.formatter.currency(restart75);

        const elR25 = document.getElementById('daily-form-restart-25');
        if (elR25) elR25.textContent = window.app.formatter.currency(restart25);

        const elFormula = document.getElementById('daily-form-kanovi-total-formula');
        if (elFormula) {
            elFormula.innerHTML = `Total Hak KNVI: <strong>${window.app.formatter.currency(kanovi)}</strong> + 75% R (<strong>${window.app.formatter.currency(restart75)}</strong>) = <strong style="color: #8e44ad;">${window.app.formatter.currency(kanoviTotalShare)}</strong>`;
        }
        
        const diffEl = document.getElementById('daily-form-diff');
        if (diffEl) {
            diffEl.textContent = window.app.formatter.currency(diff);
            if (diff < 0) {
                diffEl.style.color = 'var(--danger-color)';
            } else if (diff > 0) {
                diffEl.style.color = 'var(--success-color)';
            } else {
                diffEl.style.color = 'var(--text-primary)';
            }
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
                confirmButtonText: 'Ya, hapus!',
                width: '400px',
                customClass: {
                    popup: 'swal-wide'
                }
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
