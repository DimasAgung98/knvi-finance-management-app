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

                // Find existing bonus record
                let record = this.bonusRecords.find(b => b.date === daily.date);
                
                // Assigned staff: only if record exists and has staffIds set
                const isStaffConfigured = record && record.staffIds && record.staffIds.length > 0;
                const assignedStaff = isStaffConfigured 
                    ? this.staffList.filter(s => record.staffIds.includes(s.id))
                    : [];
                const staffCount = assignedStaff.length > 0 ? assignedStaff.length : 1;
                const bonusPerStaff = (targetReached && assignedStaff.length > 0) ? Math.round(bonusAmount / staffCount) : 0;

                const isPaid = record ? (record.status === 'PAID') : false;

                if (targetReached) {
                    daysAchieved++;
                    totalBonusAccumulated += bonusAmount;
                    if (isPaid) {
                        totalBonusPaid += bonusAmount;
                    } else {
                        totalBonusPending += bonusAmount;
                    }
                }

                const statusBadge = targetReached
                    ? (isPaid 
                        ? `<span class="badge" style="background: var(--success-color); color: #fff;"><i class="ph ph-check-circle"></i> Sudah Dibayar</span>`
                        : `<span class="badge" style="background: var(--warning-color); color: #fff;"><i class="ph ph-clock"></i> Belum Dibayar</span>`)
                    : `<span class="badge" style="background: rgba(0,0,0,0.1); color: var(--text-muted);">-</span>`;

                const targetBadge = targetReached
                    ? `<span style="color: var(--success-color); font-weight: 600;"><i class="ph ph-trend-up"></i> Capai Target</span>`
                    : `<span style="color: var(--text-muted); font-size: 0.9em;"><i class="ph ph-minus"></i> Belum Capai</span>`;

                let staffSummary = '';
                if (!targetReached) {
                    staffSummary = `<span style="color: var(--text-muted); font-size: 0.85rem;">-</span>`;
                } else if (assignedStaff.length > 0) {
                    const chips = assignedStaff.map(s => 
                        `<span class="badge" style="background: rgba(142, 68, 173, 0.15); color: #8e44ad; font-size: 0.78rem; font-weight: 500; margin: 1px 2px;">${s.name}</span>`
                    ).join('');
                    staffSummary = `
                        <div>
                            <div style="display: flex; flex-wrap: wrap; gap: 2px; margin-bottom: 2px;">${chips}</div>
                            <div style="font-size: 0.78rem; color: var(--text-muted);">${assignedStaff.length} orang &bull; <strong style="color: var(--text-primary);">${window.app.formatter.currency(bonusPerStaff)}</strong>/orang</div>
                        </div>
                    `;
                } else {
                    staffSummary = `
                        <div style="color: var(--warning-color); font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                            <i class="ph ph-warning"></i> Belum Pilih Staff
                        </div>
                    `;
                }

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
                            ${targetReached ? `
                                <button class="btn btn-secondary" onclick="window.app.bonus.openStaffRoster('${daily.date}')" style="padding: 4px 8px; font-size: 0.85rem;" title="Pilih staff bertugas">
                                    <i class="ph ph-users"></i> ${assignedStaff.length > 0 ? 'Ubah Staff' : 'Pilih Staff'}
                                </button>
                                ${!isPaid ? `
                                    <button class="btn btn-primary" onclick="window.app.bonus.openPayoutModal('${daily.date}', ${omzet}, ${bonusAmount})" style="padding: 4px 10px; font-size: 0.85rem; margin-left: 4px;" title="Bayarkan bonus hari ini">
                                        <i class="ph ph-hand-coins"></i> Bayarkan
                                    </button>
                                ` : ''}
                            ` : `<span style="color: var(--text-muted); font-size: 0.85rem;">-</span>`}
                        </td>
                    </tr>
                `;
            });
        }

        // Render per-staff summary table
        this.renderStaffSummary(filteredDaily);

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

    renderStaffSummary(filteredDaily) {
        const tbody = document.getElementById('bonus-staff-summary-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.staffList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Belum ada data staff. Silakan tambahkan nama staff di atas.</td></tr>`;
            return;
        }

        this.staffList.forEach(staff => {
            let daysCount = 0;
            let totalEarned = 0;
            let totalPaid = 0;
            let totalPending = 0;

            filteredDaily.forEach(daily => {
                const omzet = (daily.kanovi || (daily.cash || 0) + (daily.qris || 0)) + (daily.restart || 0);
                const targetReached = omzet >= this.TARGET_OMZET;
                if (targetReached) {
                    const bonusAmount = Math.round(omzet * this.BONUS_PERCENTAGE);
                    const record = this.bonusRecords.find(b => b.date === daily.date);
                    const staffIds = record ? (record.staffIds || []) : [];

                    if (staffIds.includes(staff.id)) {
                        daysCount++;
                        const share = Math.round(bonusAmount / (staffIds.length || 1));
                        totalEarned += share;
                        if (record && record.status === 'PAID') {
                            totalPaid += share;
                        } else {
                            totalPending += share;
                        }
                    }
                }
            });

            const statusLabel = totalEarned === 0
                ? `<span style="color: var(--text-muted); font-size: 0.85rem;">-</span>`
                : (totalPending === 0
                    ? `<span class="badge" style="background: var(--success-color); color: #fff;"><i class="ph ph-check-circle"></i> Lunas</span>`
                    : `<span class="badge" style="background: var(--warning-color); color: #fff;"><i class="ph ph-clock"></i> Belum Dibayar</span>`);

            tbody.innerHTML += `
                <tr>
                    <td style="text-align: left; font-weight: 600;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(142, 68, 173, 0.15); color: #8e44ad; display: flex; align-items: center; justify-content: center; font-size: 0.85rem;">
                                <i class="ph ph-user"></i>
                            </div>
                            <span>${staff.name}</span>
                        </div>
                    </td>
                    <td style="text-align: center;">
                        <span class="badge" style="background: rgba(255,255,255,0.08); font-size: 0.85rem; font-weight: 600;">
                            ${daysCount} Hari
                        </span>
                    </td>
                    <td style="text-align: right; font-weight: bold; color: var(--primary-color);">
                        ${window.app.formatter.currency(totalEarned)}
                    </td>
                    <td style="text-align: right; color: var(--success-color); font-weight: 600;">
                        ${window.app.formatter.currency(totalPaid)}
                    </td>
                    <td style="text-align: right;">
                        ${totalPending > 0 
                            ? `<span style="color: var(--warning-color); font-weight: 700;">${window.app.formatter.currency(totalPending)}</span>`
                            : `<span style="color: var(--text-muted);">Rp 0</span>`}
                    </td>
                    <td style="text-align: center;">
                        <button class="btn btn-secondary" onclick="window.app.bonus.showStaffDetail('${staff.id}')" style="padding: 4px 10px; font-size: 0.82rem;" title="Lihat Riwayat Hari & Bonus">
                            <i class="ph ph-list-magnifying-glass"></i> Rincian
                        </button>
                    </td>
                </tr>
            `;
        });
    },

    showStaffDetail(staffId) {
        const staff = this.staffList.find(s => s.id === staffId);
        if (!staff) return;

        const filteredDaily = this.getFilteredDates();
        let rows = [];
        let daysCount = 0;
        let totalEarned = 0;
        let totalPaid = 0;
        let totalPending = 0;

        filteredDaily.forEach(daily => {
            const omzet = (daily.kanovi || (daily.cash || 0) + (daily.qris || 0)) + (daily.restart || 0);
            const targetReached = omzet >= this.TARGET_OMZET;
            if (targetReached) {
                const bonusAmount = Math.round(omzet * this.BONUS_PERCENTAGE);
                const record = this.bonusRecords.find(b => b.date === daily.date);
                const staffIds = record ? (record.staffIds || []) : [];
                if (staffIds.includes(staff.id)) {
                    daysCount++;
                    const share = Math.round(bonusAmount / (staffIds.length || 1));
                    totalEarned += share;
                    const isPaid = record && record.status === 'PAID';
                    if (isPaid) {
                        totalPaid += share;
                    } else {
                        totalPending += share;
                    }
                    rows.push({
                        date: daily.date,
                        omzet: omzet,
                        bonusAmount: bonusAmount,
                        staffCount: staffIds.length,
                        share: share,
                        isPaid: isPaid
                    });
                }
            }
        });

        const html = `
            <div style="background: var(--bg-surface); padding: 14px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-bottom: 16px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 12px; text-align: center;">
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">Hari Dapat Bonus</div>
                        <strong style="font-size: 1.15rem;">${daysCount} Hari</strong>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">Total Hak Bonus</div>
                        <strong style="font-size: 1.15rem; color: var(--primary-color);">${window.app.formatter.currency(totalEarned)}</strong>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">Sudah Dibayar</div>
                        <strong style="font-size: 1.15rem; color: var(--success-color);">${window.app.formatter.currency(totalPaid)}</strong>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">Belum Dibayar</div>
                        <strong style="font-size: 1.15rem; color: var(--warning-color);">${window.app.formatter.currency(totalPending)}</strong>
                    </div>
                </div>
            </div>

            <div style="max-height: 320px; overflow-y: auto;">
                <table class="excel-table">
                    <thead>
                        <tr>
                            <th style="text-align: left;">Tanggal</th>
                            <th style="text-align: right;">Omzet Toko</th>
                            <th style="text-align: right;">Total Bonus (2%)</th>
                            <th style="text-align: center;">Dibagi</th>
                            <th style="text-align: right;">Hak Staff Ini</th>
                            <th style="text-align: center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length === 0 ? `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Belum ada riwayat bonus untuk staff ini pada periode yang dipilih.</td></tr>` : 
                        rows.map(r => `
                            <tr>
                                <td style="text-align: left; font-weight: 500;">${r.date}</td>
                                <td style="text-align: right;">${window.app.formatter.currency(r.omzet)}</td>
                                <td style="text-align: right;">${window.app.formatter.currency(r.bonusAmount)}</td>
                                <td style="text-align: center;">${r.staffCount} Orang</td>
                                <td style="text-align: right; font-weight: bold; color: var(--primary-color);">${window.app.formatter.currency(r.share)}</td>
                                <td style="text-align: center;">
                                    ${r.isPaid 
                                        ? `<span class="badge" style="background: var(--success-color); color: #fff;"><i class="ph ph-check-circle"></i> Dibayar</span>`
                                        : `<span class="badge" style="background: var(--warning-color); color: #fff;"><i class="ph ph-clock"></i> Belum</span>`}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div style="display: flex; justify-content: flex-end; margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 14px;">
                <button type="button" class="btn btn-secondary" onclick="window.app.modal.close()">Tutup</button>
            </div>
        `;

        window.app.modal.open(`Rincian Bonus Staff: ${staff.name}`, html, '650px');
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
        const dailyRecords = window.app.storage ? window.app.storage.getDailyRecords() : [];
        const daily = dailyRecords.find(d => d.date === dateStr);
        const omzet = daily ? ((daily.kanovi || (daily.cash || 0) + (daily.qris || 0)) + (daily.restart || 0)) : 0;
        const bonusAmount = Math.round(omzet * this.BONUS_PERCENTAGE);

        let record = this.bonusRecords.find(b => b.date === dateStr);
        // If manager already selected staff for this date, use that. Otherwise default to empty so manager picks explicitly!
        let selectedIds = (record && record.staffIds) ? record.staffIds : [];

        const html = `
            <div style="background: var(--bg-surface); padding: 12px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.88rem;">
                    <span style="color: var(--text-secondary);">Tanggal Rekap:</span>
                    <strong>${dateStr}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.88rem;">
                    <span style="color: var(--text-secondary);">Total Omzet Toko:</span>
                    <strong>${window.app.formatter.currency(omzet)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.88rem;">
                    <span style="color: var(--text-secondary);">Total Bonus Omzet (2%):</span>
                    <strong style="color: var(--primary-color); font-size: 1.15rem;">${window.app.formatter.currency(bonusAmount)}</strong>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-weight: 600; font-size: 0.9rem;">Centang staff yang bertugas pada hari ini:</span>
                <div style="display: flex; gap: 6px;">
                    <button type="button" class="btn btn-secondary" onclick="window.app.bonus.toggleAllRoster(true, ${bonusAmount})" style="padding: 2px 8px; font-size: 0.75rem;">Pilih Semua</button>
                    <button type="button" class="btn btn-secondary" onclick="window.app.bonus.toggleAllRoster(false, ${bonusAmount})" style="padding: 2px 8px; font-size: 0.75rem;">Batal Semua</button>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 240px; overflow-y: auto; padding-right: 6px; margin-bottom: 16px;">
                ${this.staffList.length === 0 ? `<p style="color: var(--text-muted); font-size: 0.85rem;">Belum ada nama staff terdaftar.</p>` :
                this.staffList.map(staff => `
                    <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); cursor: pointer;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" class="roster-checkbox" value="${staff.id}" ${selectedIds.includes(staff.id) ? 'checked' : ''} onchange="window.app.bonus.updateRosterPreview(${bonusAmount})" style="width: 18px; height: 18px; cursor: pointer;">
                            <span style="font-weight: 500;">${staff.name}</span>
                        </div>
                        <span class="badge" style="background: rgba(142, 68, 173, 0.1); color: #8e44ad; font-size: 0.75rem;">Staff</span>
                    </label>
                `).join('')}
            </div>

            <!-- Dynamic Calculation Preview -->
            <div style="background: rgba(142, 68, 173, 0.08); border: 1px solid rgba(142, 68, 173, 0.25); border-radius: var(--radius-sm); padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                <div>
                    <span style="color: var(--text-secondary);">Jumlah Penerima:</span>
                    <strong id="roster-count-preview" style="margin-left: 4px;">0 Orang</strong>
                </div>
                <div>
                    <span style="color: var(--text-secondary);">Bonus per Orang:</span>
                    <strong id="roster-share-preview" style="color: #8e44ad; font-size: 1.15rem; margin-left: 6px;">Rp 0</strong>
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 14px;">
                <button type="button" class="btn btn-secondary" onclick="window.app.modal.close()">Batal</button>
                <button type="button" class="btn btn-primary" onclick="window.app.bonus.saveStaffRoster('${dateStr}')"><i class="ph ph-check"></i> Simpan Pilihan Staff</button>
            </div>
        `;

        window.app.modal.open(`Pilih Staff Penerima Bonus (${dateStr})`, html, '540px');
        setTimeout(() => this.updateRosterPreview(bonusAmount), 50);
    },

    toggleAllRoster(checkAll, bonusAmount) {
        document.querySelectorAll('.roster-checkbox').forEach(cb => cb.checked = checkAll);
        this.updateRosterPreview(bonusAmount);
    },

    updateRosterPreview(bonusAmount) {
        const checkedCount = document.querySelectorAll('.roster-checkbox:checked').length;
        const countEl = document.getElementById('roster-count-preview');
        const shareEl = document.getElementById('roster-share-preview');
        if (countEl) countEl.textContent = `${checkedCount} Orang`;
        const share = checkedCount > 0 ? Math.round(bonusAmount / checkedCount) : 0;
        if (shareEl) shareEl.textContent = window.app.formatter.currency(share);
    },

    saveStaffRoster(dateStr) {
        const checkboxes = document.querySelectorAll('.roster-checkbox:checked');
        const selectedIds = Array.from(checkboxes).map(cb => cb.value);

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
                title: 'Penugasan Tersimpan',
                text: `${selectedIds.length} staff dipilih untuk menerima bonus tanggal ${dateStr}.`,
                toast: true,
                position: 'top-end',
                timer: 1800,
                showConfirmButton: false
            });
        }
    },

    openPayoutModal(dateStr, omzet, bonusAmount) {
        const record = this.bonusRecords.find(b => b.date === dateStr);
        const selectedIds = record ? (record.staffIds || []) : [];
        const assignedStaff = this.staffList.filter(s => selectedIds.includes(s.id));

        if (assignedStaff.length === 0) {
            if (window.Swal) {
                Swal.fire({
                    title: 'Pilih Staff Terlebih Dahulu',
                    text: 'Belum ada staff yang dipilih untuk menerima bonus pada tanggal ini. Silakan tentukan staff penerima terlebih dahulu.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Pilih Staff Sekarang',
                    cancelButtonText: 'Batal'
                }).then(result => {
                    if (result.isConfirmed) {
                        this.openStaffRoster(dateStr);
                    }
                });
            }
            return;
        }

        const staffCount = assignedStaff.length;
        const bonusPerStaff = Math.round(bonusAmount / staffCount);

        const html = `
            <div style="background: var(--bg-surface); padding: 14px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.88rem;">
                    <span style="color: var(--text-secondary);">Tanggal Rekap:</span>
                    <strong>${dateStr}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.88rem;">
                    <span style="color: var(--text-secondary);">Total Omzet:</span>
                    <strong>${window.app.formatter.currency(omzet)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.88rem;">
                    <span style="color: var(--text-secondary);">Total Bonus (2%):</span>
                    <strong style="font-size: 1.15rem; color: var(--primary-color);">${window.app.formatter.currency(bonusAmount)}</strong>
                </div>
                <div style="border-top: 1px dashed var(--border-color); padding-top: 8px; margin-top: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 500;">Penerima Bonus (${assignedStaff.length} Staff):</span>
                        <button type="button" class="btn btn-secondary" onclick="window.app.modal.close(); window.app.bonus.openStaffRoster('${dateStr}')" style="padding: 2px 8px; font-size: 0.75rem;">
                            <i class="ph ph-pencil-simple"></i> Ubah Staff
                        </button>
                    </div>
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
        if (!record || !record.staffIds || record.staffIds.length === 0) {
            if (window.Swal) Swal.fire('Error', 'Silakan pilih staff yang bertugas terlebih dahulu.', 'warning');
            return;
        }

        const assignedStaff = this.staffList.filter(s => record.staffIds.includes(s.id));
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
