window.app = window.app || {};

window.app.bonus = {
    staffList: [],
    bonusRecords: [],
    TARGET_OMZET: 3000000,
    BONUS_PERCENTAGE: 0.02,

    init() {
        this.loadData();
        this.render();
    },

    loadData() {
        if (window.app.storage) {
            this.staffList = window.app.storage.getStaff() || [];
            this.bonusRecords = window.app.storage.getStaffBonuses() || [];
        }
        // If staff is completely empty on first run, add default template staff
        if (this.staffList.length === 0) {
            this.staffList = [
                { id: 'stf_1', name: 'Barista 1' },
                { id: 'stf_2', name: 'Barista 2' },
                { id: 'stf_3', name: 'Cashier' }
            ];
            this.saveStaffList();
        }
    },

    saveStaffList() {
        if (window.app.storage && window.app.storage.saveStaff) {
            window.app.storage.saveStaff(this.staffList);
        }
    },

    saveBonusRecords() {
        if (window.app.storage && window.app.storage.saveStaffBonuses) {
            window.app.storage.saveStaffBonuses(this.bonusRecords);
        }
    },

    onFilterChange() {
        const type = document.getElementById('bonus-filter-type').value;
        const dateInput = document.getElementById('bonus-filter-date');
        const monthInput = document.getElementById('bonus-filter-month');

        if (dateInput) dateInput.style.display = 'none';
        if (monthInput) monthInput.style.display = 'none';

        if (type === 'date' && dateInput) dateInput.style.display = 'block';
        if (type === 'month' && monthInput) monthInput.style.display = 'block';

        this.renderDashboard();
    },

    getFilteredDates() {
        const type = document.getElementById('bonus-filter-type')?.value || 'all';
        const dateVal = document.getElementById('bonus-filter-date')?.value;
        const monthVal = document.getElementById('bonus-filter-month')?.value;

        const now = new Date();
        const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

        // Get all unique dates from daily records
        const dailyRecords = window.app.storage ? window.app.storage.getDailyRecords() : [];
        
        return dailyRecords.filter(item => {
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
        const tbody = document.getElementById('bonus-table-body');
        if (!tbody) return;

        const filteredDaily = this.getFilteredDates();

        let daysAchieved = 0;
        let totalBonusAccumulated = 0;
        let totalBonusPaid = 0;
        let totalBonusPending = 0;

        tbody.innerHTML = '';

        if (filteredDaily.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px;">Belum ada data omzet harian pada periode ini. Silakan catat di menu <strong>Rekap Harian</strong> terlebih dahulu.</td></tr>`;
        } else {
            filteredDaily.forEach(daily => {
                const omzet = (daily.kanovi || (daily.cash || 0) + (daily.qris || 0)) + (daily.restart || 0);
                const targetReached = omzet >= this.TARGET_OMZET;
                const bonusAmount = targetReached ? Math.round(omzet * this.BONUS_PERCENTAGE) : 0;

                // Find or create bonus record
                let record = this.bonusRecords.find(b => b.date === daily.date);
                if (!record) {
                    record = {
                        id: 'bon_' + daily.date,
                        date: daily.date,
                        staffIds: this.staffList.map(s => s.id),
                        status: 'PENDING'
                    };
                }

                // Assigned staff
                const assignedStaff = this.staffList.filter(s => (record.staffIds || []).includes(s.id));
                const staffCount = assignedStaff.length > 0 ? assignedStaff.length : 1;
                const bonusPerStaff = targetReached ? Math.round(bonusAmount / staffCount) : 0;

                if (targetReached) {
                    daysAchieved++;
                    totalBonusAccumulated += bonusAmount;
                    if (record.status === 'PAID') {
                        totalBonusPaid += bonusAmount;
                    } else {
                        totalBonusPending += bonusAmount;
                    }
                }

                const isPaid = record.status === 'PAID';
                const statusBadge = targetReached
                    ? (isPaid 
                        ? `<span class="badge" style="background: var(--success-color); color: #fff;"><i class="ph ph-check-circle"></i> Sudah Dibayar</span>`
                        : `<span class="badge" style="background: var(--warning-color); color: #fff;"><i class="ph ph-clock"></i> Belum Dibayar</span>`)
                    : `<span class="badge" style="background: rgba(0,0,0,0.1); color: var(--text-muted);">Tidak Ada Bonus</span>`;

                const targetBadge = targetReached
                    ? `<span style="color: var(--success-color); font-weight: 600;"><i class="ph ph-trend-up"></i> Capai Target</span>`
                    : `<span style="color: var(--text-muted); font-size: 0.9em;"><i class="ph ph-minus"></i> Belum Capai (Target 3 Juta)</span>`;

                const staffSummary = assignedStaff.length > 0 
                    ? `<span title="${assignedStaff.map(s => s.name).join(', ')}">${assignedStaff.length} Staff (${window.app.formatter.currency(bonusPerStaff)}/orang)</span>`
                    : `<span style="color: var(--danger-color);">Belum pilih staff</span>`;

                tbody.innerHTML += `
                    <tr>
                        <td style="text-align: left; font-weight: 500;">${daily.date}</td>
                        <td style="text-align: right; font-weight: bold;">${window.app.formatter.currency(omzet)}</td>
                        <td style="text-align: center;">${targetBadge}</td>
                        <td style="text-align: right; font-weight: bold; color: ${targetReached ? 'var(--primary-color)' : 'var(--text-muted)'};">
                            ${window.app.formatter.currency(bonusAmount)}
                        </td>
                        <td style="text-align: left;">${staffSummary}</td>
                        <td style="text-align: center;">${statusBadge}</td>
                        <td style="text-align: center; white-space: nowrap;">
                            <button class="btn btn-secondary" onclick="window.app.bonus.openStaffRoster('${daily.date}')" style="padding: 4px 8px; font-size: 0.85rem;" title="Atur Staff yang Bertugas">
                                <i class="ph ph-users"></i> Staff
                            </button>
                            ${targetReached && !isPaid ? `
                                <button class="btn btn-primary" onclick="window.app.bonus.openPayoutModal('${daily.date}', ${omzet}, ${bonusAmount})" style="padding: 4px 10px; font-size: 0.85rem; margin-left: 4px;">
                                    <i class="ph ph-hand-coins"></i> Bayarkan
                                </button>
                            ` : ''}
                        </td>
                    </tr>
                `;
            });
        }

        // Update cards
        const setEl = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setEl('bonus-dash-days', daysAchieved + ' Hari');
        setEl('bonus-dash-accumulated', window.app.formatter.currency(totalBonusAccumulated));
        setEl('bonus-dash-pending', window.app.formatter.currency(totalBonusPending));
        setEl('bonus-dash-paid', window.app.formatter.currency(totalBonusPaid));
    },

    renderStaffManagement() {
        const container = document.getElementById('staff-chips-container');
        if (!container) return;

        if (this.staffList.length === 0) {
            container.innerHTML = '<span style="color: var(--text-muted); font-size: 0.9rem;">Belum ada data staff. Silakan tambahkan di bawah.</span>';
            return;
        }

        container.innerHTML = this.staffList.map(staff => `
            <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 20px; font-size: 0.9rem;">
                <i class="ph ph-user" style="color: var(--primary-color);"></i>
                <span style="font-weight: 500;">${staff.name}</span>
                <button onclick="window.app.bonus.deleteStaff('${staff.id}')" style="background: none; border: none; cursor: pointer; color: var(--danger-color); padding: 0; margin-left: 4px; display: flex; align-items: center;" title="Hapus Staff">
                    <i class="ph ph-x-circle"></i>
                </button>
            </div>
        `).join('');
    },

    render() {
        this.loadData();
        this.renderDashboard();
        this.renderStaffManagement();
    },

    addStaff() {
        const input = document.getElementById('new-staff-name-input');
        if (!input) return;
        const name = input.value.trim();

        if (!name) {
            if (window.Swal) Swal.fire('Error', 'Nama staff tidak boleh kosong', 'warning');
            return;
        }

        const newStaff = {
            id: 'stf_' + Date.now().toString(36),
            name: name
        };

        this.staffList.push(newStaff);
        this.saveStaffList();
        input.value = '';
        this.renderStaffManagement();
        this.renderDashboard();

        if (window.Swal) {
            Swal.fire({
                icon: 'success',
                title: 'Staff Ditambahkan',
                text: `${name} berhasil ditambahkan ke daftar staff.`,
                toast: true,
                position: 'top-end',
                timer: 1500,
                showConfirmButton: false
            });
        }
    },

    deleteStaff(id) {
        const staff = this.staffList.find(s => s.id === id);
        const name = staff ? staff.name : 'Staff';

        if (window.Swal) {
            Swal.fire({
                title: `Hapus ${name}?`,
                text: "Staff ini akan dihapus dari daftar master.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Ya, Hapus'
            }).then(result => {
                if (result.isConfirmed) {
                    this.staffList = this.staffList.filter(s => s.id !== id);
                    this.saveStaffList();
                    this.renderStaffManagement();
                    this.renderDashboard();
                    Swal.fire('Terhapus', `${name} telah dihapus.`, 'success');
                }
            });
        } else {
            this.staffList = this.staffList.filter(s => s.id !== id);
            this.saveStaffList();
            this.renderStaffManagement();
            this.renderDashboard();
        }
    },

    openStaffRoster(dateStr) {
        let record = this.bonusRecords.find(b => b.date === dateStr);
        let selectedIds = record ? (record.staffIds || []) : this.staffList.map(s => s.id);

        const html = `
            <p style="color: var(--text-secondary); margin-bottom: 16px;">
                Pilih staff yang bertugas pada tanggal <strong>${dateStr}</strong>. Bonus omzet akan dibagi rata hanya kepada staff yang dicentang.
            </p>
            <div style="display: flex; flex-direction: column; gap: 10px; max-height: 250px; overflow-y: auto; padding-right: 8px;">
                ${this.staffList.map(staff => `
                    <label style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm); cursor: pointer;">
                        <input type="checkbox" class="roster-checkbox" value="${staff.id}" ${selectedIds.includes(staff.id) ? 'checked' : ''} style="width: 18px; height: 18px;">
                        <span style="font-weight: 500;">${staff.name}</span>
                    </label>
                `).join('')}
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                <button type="button" class="btn btn-secondary" onclick="window.app.modal.close()">Batal</button>
                <button type="button" class="btn btn-primary" onclick="window.app.bonus.saveStaffRoster('${dateStr}')"><i class="ph ph-check"></i> Simpan Penugasan</button>
            </div>
        `;

        window.app.modal.open(`Staff Bertugas: ${dateStr}`, html, '500px');
    },

    saveStaffRoster(dateStr) {
        const checkboxes = document.querySelectorAll('.roster-checkbox:checked');
        const selectedIds = Array.from(checkboxes).map(cb => cb.value);

        if (selectedIds.length === 0) {
            if (window.Swal) Swal.fire('Error', 'Minimal pilih 1 staff yang bertugas.', 'warning');
            return;
        }

        let record = this.bonusRecords.find(b => b.date === dateStr);
        if (record) {
            record.staffIds = selectedIds;
        } else {
            record = {
                id: 'bon_' + dateStr,
                date: dateStr,
                staffIds: selectedIds,
                status: 'PENDING'
            };
            this.bonusRecords.push(record);
        }

        this.saveBonusRecords();
        window.app.modal.close();
        this.renderDashboard();

        if (window.Swal) {
            Swal.fire({
                icon: 'success',
                title: 'Tersimpan',
                text: 'Penugasan staff untuk tanggal ini berhasil disimpan.',
                toast: true,
                position: 'top-end',
                timer: 1500,
                showConfirmButton: false
            });
        }
    },

    openPayoutModal(dateStr, omzet, bonusAmount) {
        const record = this.bonusRecords.find(b => b.date === dateStr);
        const selectedIds = record ? (record.staffIds || []) : this.staffList.map(s => s.id);
        const assignedStaff = this.staffList.filter(s => selectedIds.includes(s.id));
        const staffCount = assignedStaff.length > 0 ? assignedStaff.length : 1;
        const bonusPerStaff = Math.round(bonusAmount / staffCount);

        const html = `
            <div style="background: var(--bg-surface); padding: 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--text-secondary);">Tanggal Rekap:</span>
                    <strong>${dateStr}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--text-secondary);">Total Omzet:</span>
                    <strong>${window.app.formatter.currency(omzet)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--text-secondary);">Total Bonus (2%):</span>
                    <strong style="font-size: 1.2rem; color: var(--primary-color);">${window.app.formatter.currency(bonusAmount)}</strong>
                </div>
                <div style="border-top: 1px dashed var(--border-color); padding-top: 8px; margin-top: 8px;">
                    <div style="color: var(--text-secondary); margin-bottom: 4px; font-size: 0.85rem;">Penerima Bonus (${assignedStaff.length} Staff):</div>
                    <ul style="margin: 0; padding-left: 20px; font-size: 0.9rem;">
                        ${assignedStaff.map(s => `<li><strong>${s.name}</strong>: ${window.app.formatter.currency(bonusPerStaff)}</li>`).join('')}
                    </ul>
                </div>
            </div>

            <div style="margin-bottom: 24px;">
                <label style="display: block; font-weight: 600; margin-bottom: 6px;">Ambil Dana Bonus Dari:</label>
                <select id="payout-source" class="form-control" style="font-weight: 500;">
                    <option value="Cash_Today">Potong Omzet Cash Hari Ini (Laci Kasir)</option>
                    <option value="QRIS_Today">Potong Omzet QRIS Hari Ini</option>
                    <option value="Cash_Savings" selected>Ambil dari Tabungan Cash (Kas Kemarin / Brankas)</option>
                    <option value="Bank_Savings">Ambil dari Tabungan QRIS / Bank (Rekening Toko)</option>
                </select>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">
                    * Pembayaran bonus ini akan otomatis dicatat ke menu <strong>Pengeluaran</strong> dan memotong saldo sesuai sumber dana yang Anda pilih.
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                <button type="button" class="btn btn-secondary" onclick="window.app.modal.close()">Batal</button>
                <button type="button" class="btn btn-primary" onclick="window.app.bonus.executePayout('${dateStr}', ${bonusAmount})">
                    <i class="ph ph-check-circle"></i> Konfirmasi & Bayarkan
                </button>
            </div>
        `;

        window.app.modal.open(`Bayarkan Bonus Staff (${dateStr})`, html, '550px');
    },

    executePayout(dateStr, bonusAmount) {
        const sourceSelect = document.getElementById('payout-source');
        const source = sourceSelect ? sourceSelect.value : 'Cash_Savings';

        let record = this.bonusRecords.find(b => b.date === dateStr);
        if (!record) {
            record = {
                id: 'bon_' + dateStr,
                date: dateStr,
                staffIds: this.staffList.map(s => s.id),
                status: 'PENDING'
            };
            this.bonusRecords.push(record);
        }

        const assignedStaff = this.staffList.filter(s => (record.staffIds || []).includes(s.id));
        const staffNames = assignedStaff.map(s => s.name).join(', ');

        const today = new Date().toISOString().split('T')[0];

        // 1. Create expense entry in expenses
        const expenseItem = {
            id: 'exp_bon_' + Date.now().toString(36),
            date: today,
            desc: `Bonus Staff Omzet ${dateStr} (${staffNames})`,
            amount: bonusAmount,
            source: source
        };

        if (window.app.expenses) {
            window.app.expenses.data.push(expenseItem);
            window.app.expenses.saveData();
            if (window.app.expenses.renderTable) window.app.expenses.renderTable();
        }

        // 2. Mark record as PAID
        record.status = 'PAID';
        record.paidAt = Date.now();
        record.paidSource = source;
        record.expenseId = expenseItem.id;
        this.saveBonusRecords();

        // 3. Update Daily Dashboard & UI
        if (window.app.daily) window.app.daily.renderDashboard();
        this.renderDashboard();

        window.app.modal.close();

        if (window.Swal) {
            Swal.fire({
                icon: 'success',
                title: 'Bonus Berhasil Dibayarkan!',
                html: `
                    <p>Bonus sebesar <strong>${window.app.formatter.currency(bonusAmount)}</strong> telah dicatat ke <strong>Pengeluaran</strong>.</p>
                    <p style="font-size: 0.85rem; color: var(--text-muted);">Sumber dana: <strong>${source}</strong></p>
                `,
                confirmButtonText: 'Selesai'
            });
        }
    }
};
