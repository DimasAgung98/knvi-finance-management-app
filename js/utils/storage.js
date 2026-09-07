window.app = window.app || {};

window.app.storage = {
    KEYS: {
        INGREDIENTS: 'hpp_ingredients',
        RECIPES: 'hpp_recipes',
        SETTINGS: 'hpp_settings',
        OPEX: 'hpp_opex',
        PROJECTIONS: 'hpp_projections',
        SALES_HISTORY: 'hpp_sales_history',
        DAILY_EXPENSES: 'knvi_expenses',
        DAILY_RECORDS: 'knvi_daily_records',
        STAFF: 'knvi_staff',
        STAFF_BONUSES: 'knvi_staff_bonuses',
        RECIPES_TYPES: 'hpp_recipes_types'
    },

    syncListeners: {},
    isSyncing: false,

    isFirstRun() {
        return !localStorage.getItem(this.KEYS.INGREDIENTS);
    },

    seedDummyData() {
        const dummyIngredients = [
            { id: 'ing_1', name: 'Espresso', category: 'Coffee', buyPrice: 150000, qty: 1000, unit: 'gram', costPerUnit: 150 },
            { id: 'ing_2', name: 'Fresh Milk', category: 'Dairy', buyPrice: 20000, qty: 1000, unit: 'ml', costPerUnit: 20 },
            { id: 'ing_3', name: 'Vanilla Syrup', category: 'Syrup', buyPrice: 120000, qty: 750, unit: 'ml', costPerUnit: 160 },
            { id: 'ing_4', name: 'Plastic Cup 16oz', category: 'Packaging', buyPrice: 50000, qty: 50, unit: 'pcs', costPerUnit: 1000 }
        ];

        const dummyRecipes = [
            {
                id: 'rec_1',
                name: 'Vanilla Latte Ice',
                ingredients: [
                    { id: 'ing_1', name: 'Espresso', usage: 18, unit: 'gram', cost: 2700 },
                    { id: 'ing_2', name: 'Fresh Milk', usage: 150, unit: 'ml', cost: 3000 },
                    { id: 'ing_3', name: 'Vanilla Syrup', usage: 20, unit: 'ml', cost: 3200 },
                    { id: 'ing_4', name: 'Plastic Cup 16oz', usage: 1, unit: 'pcs', cost: 1000 }
                ],
                totalCost: 9900,
                suggestedPrice: 28000
            }
        ];

        const dummyOpex = [
            { id: 'opex_1', name: 'Gaji Barista', category: 'Labor', monthlyCost: 3500000 },
            { id: 'opex_2', name: 'Listrik & Air', category: 'Utility', monthlyCost: 1200000 },
            { id: 'opex_3', name: 'Sewa Ruko (Bulanan)', category: 'Rent', monthlyCost: 2500000 }
        ];

        this.save(this.KEYS.INGREDIENTS, dummyIngredients);
        this.save(this.KEYS.RECIPES, dummyRecipes);
        this.save(this.KEYS.OPEX, dummyOpex);
        console.log("Dummy data seeded.");
    },

    get(key) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null || raw === undefined) return [];
            return JSON.parse(raw);
        } catch (e) {
            console.error(`Error parsing storage key ${key}:`, e);
            return [];
        }
    },

    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`Error saving to localStorage for ${key}:`, e);
        }
        this.pushToFirebase(key, data);
    },

    pushToFirebase(key, data) {
        if (!window.app.firebase || !window.app.firebase.db) return;
        const { db, doc, setDoc } = window.app.firebase;
        const docRef = doc(db, 'kanovi_data', key);
        this.updateSyncStatus('syncing', 'Menyimpan ke Cloud...');
        setDoc(docRef, { data: data, updatedAt: Date.now() })
            .then(() => {
                this.updateSyncStatus('connected', 'Cloud Synced');
            })
            .catch(err => {
                console.error("Firebase push error:", err);
                this.updateSyncStatus('error', 'Gagal Sync ke Cloud');
            });
    },

    mergeCollections(local, remote) {
        if (!Array.isArray(local) && !Array.isArray(remote)) {
            return remote !== undefined ? remote : local;
        }
        if (!Array.isArray(local)) return remote || [];
        if (!Array.isArray(remote)) return local || [];

        // If both are arrays, merge by item.id if available
        const hasId = (item) => item && typeof item === 'object' && ('id' in item);
        if (local.some(hasId) || remote.some(hasId)) {
            const map = new Map();
            // Put local items first
            local.forEach(item => {
                if (item && item.id) map.set(String(item.id), item);
            });
            // Overwrite with remote items or append new remote items
            remote.forEach(item => {
                if (item && item.id) map.set(String(item.id), item);
            });
            return Array.from(map.values());
        }

        // Primitive array (e.g. category types)
        return Array.from(new Set([...local, ...remote]));
    },

    updateSyncStatus(status, text) {
        const badge = document.getElementById('cloud-sync-status');
        if (!badge) return;

        let icon = '<i class="ph ph-cloud-check" style="color: #2b8a3e;"></i>';
        let color = 'var(--text-secondary)';

        if (status === 'syncing') {
            icon = '<i class="ph ph-arrows-clockwise ph-spin" style="color: var(--primary-color);"></i>';
            color = 'var(--primary-color)';
        } else if (status === 'error') {
            icon = '<i class="ph ph-warning-circle" style="color: var(--danger-color);"></i>';
            color = 'var(--danger-color)';
        } else if (status === 'offline') {
            icon = '<i class="ph ph-cloud-slash" style="color: var(--text-muted);"></i>';
            color = 'var(--text-muted)';
        }

        badge.innerHTML = `${icon} <span style="font-size: 0.8rem; font-weight: 500; color: ${color};">${text}</span>`;
    },

    async initFirebaseSync() {
        if (!window.app.firebase || !window.app.firebase.db) {
            console.warn("Firebase not initialized yet. Skipping initFirebaseSync.");
            return;
        }

        if (this.isSyncing) return;
        this.isSyncing = true;

        const { db, doc, getDoc, setDoc, onSnapshot } = window.app.firebase;
        const keys = Object.values(this.KEYS);

        this.updateSyncStatus('syncing', 'Menyinkronkan Cloud...');

        for (const key of keys) {
            // Unsubscribe existing listener if any
            if (this.syncListeners[key]) {
                try { this.syncListeners[key](); } catch(e){}
            }

            const docRef = doc(db, 'kanovi_data', key);
            try {
                const docSnap = await getDoc(docRef);
                const localData = this.get(key);
                const hasLocalData = Array.isArray(localData) 
                    ? localData.length > 0 
                    : (localData && Object.keys(localData).length > 0);

                if (!docSnap.exists()) {
                    // Remote document doesn't exist yet
                    if (hasLocalData) {
                        console.log(`[Firebase Sync] Initial upload for ${key}...`);
                        await setDoc(docRef, { data: localData, updatedAt: Date.now() });
                    }
                } else {
                    const remoteData = docSnap.data()?.data;
                    const hasRemoteData = Array.isArray(remoteData)
                        ? remoteData.length > 0
                        : (remoteData && Object.keys(remoteData).length > 0);

                    if (hasLocalData && !hasRemoteData) {
                        // Local has data (e.g. tablet), remote is empty -> Upload local to cloud to prevent data loss!
                        console.log(`[Firebase Sync] Preserving local data: Uploading ${key} to empty remote...`);
                        await setDoc(docRef, { data: localData, updatedAt: Date.now() });
                    } else if (hasRemoteData && !hasLocalData) {
                        // Remote has data (cloud), local is empty (e.g. fresh PC) -> Download to local!
                        console.log(`[Firebase Sync] Downloading remote ${key} to local...`);
                        localStorage.setItem(key, JSON.stringify(remoteData));
                    } else if (hasRemoteData && hasLocalData) {
                        // Both have data -> Merge intelligently
                        const merged = this.mergeCollections(localData, remoteData);
                        localStorage.setItem(key, JSON.stringify(merged));
                        if (JSON.stringify(merged) !== JSON.stringify(remoteData)) {
                            console.log(`[Firebase Sync] Uploading merged ${key} to remote...`);
                            await setDoc(docRef, { data: merged, updatedAt: Date.now() });
                        }
                    }
                }

                // Set up real-time onSnapshot listener
                this.syncListeners[key] = onSnapshot(docRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const remoteData = snapshot.data()?.data;
                        if (remoteData === undefined) return;

                        const currentLocal = this.get(key);
                        const localStr = JSON.stringify(currentLocal);
                        const remoteStr = JSON.stringify(remoteData);

                        // Safety check: Never let an empty remote array wipe existing non-empty local records
                        if (Array.isArray(currentLocal) && currentLocal.length > 0 && Array.isArray(remoteData) && remoteData.length === 0) {
                            console.warn(`[Firebase Sync] Ignored empty remote array for ${key} to protect local records.`);
                            // Re-push local records to Firebase
                            setDoc(docRef, { data: currentLocal, updatedAt: Date.now() }).catch(e => console.error(e));
                            return;
                        }

                        if (localStr !== remoteStr) {
                            console.log(`[Firebase Sync] Realtime remote update for ${key}`);
                            localStorage.setItem(key, remoteStr);
                            
                            if (window.app.reloadAllModules) {
                                window.app.reloadAllModules();
                            }
                            window.dispatchEvent(new CustomEvent('firebase_sync_updated', { detail: { key } }));
                        }
                    }
                }, (err) => {
                    console.error(`[Firebase Sync] Snapshot listener error on ${key}:`, err);
                    this.updateSyncStatus('error', 'Koneksi Cloud Terputus');
                });

            } catch (err) {
                console.error(`[Firebase Sync] Error during init for ${key}:`, err);
                this.updateSyncStatus('error', 'Gagal Sinkronisasi');
            }
        }

        this.isSyncing = false;
        this.updateSyncStatus('connected', 'Cloud Synced');

        if (window.app.reloadAllModules) {
            window.app.reloadAllModules();
        }
        window.dispatchEvent(new CustomEvent('firebase_sync_updated', { detail: { initial: true } }));
    },

    async syncAll() {
        if (!window.app.firebase || !window.app.firebase.db) {
            if (window.Swal) Swal.fire('Error', 'Firebase belum terhubung.', 'error');
            return;
        }
        
        this.updateSyncStatus('syncing', 'Menyinkronkan...');
        try {
            await this.initFirebaseSync();
            if (window.Swal) {
                Swal.fire({
                    icon: 'success',
                    title: 'Sinkronisasi Berhasil',
                    text: 'Semua data di device ini telah tersinkron dengan Cloud.',
                    timer: 2000,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
            }
        } catch (e) {
            console.error("Manual sync failed:", e);
            this.updateSyncStatus('error', 'Sync Manual Gagal');
            if (window.Swal) Swal.fire('Error', 'Sinkronisasi gagal: ' + e.message, 'error');
        }
    },

    // Specific helpers
    getIngredients() { return this.get(this.KEYS.INGREDIENTS); },
    saveIngredients(data) { this.save(this.KEYS.INGREDIENTS, data); },
    
    getRecipes() { return this.get(this.KEYS.RECIPES); },
    saveRecipes(data) { this.save(this.KEYS.RECIPES, data); },

    getOpex() { return this.get(this.KEYS.OPEX); },
    saveOpex(data) { this.save(this.KEYS.OPEX, data); },

    getProjections() { 
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.PROJECTIONS)) || {};
        } catch (e) {
            return {};
        }
    },
    saveProjections(data) { localStorage.setItem(this.KEYS.PROJECTIONS, JSON.stringify(data)); },

    getDailyExpenses() {
        const data = this.get(this.KEYS.DAILY_EXPENSES);
        // Fallback migration check if previously saved under hpp_daily_expenses
        if ((!data || data.length === 0) && localStorage.getItem('hpp_daily_expenses')) {
            try {
                const legacy = JSON.parse(localStorage.getItem('hpp_daily_expenses'));
                if (Array.isArray(legacy) && legacy.length > 0) {
                    this.save(this.KEYS.DAILY_EXPENSES, legacy);
                    return legacy;
                }
            } catch(e){}
        }
        return data || [];
    },

    saveDailyExpenses(data) {
        this.save(this.KEYS.DAILY_EXPENSES, data);
    },

    getDailyRecords() {
        return this.get(this.KEYS.DAILY_RECORDS);
    },

    saveDailyRecords(data) {
        this.save(this.KEYS.DAILY_RECORDS, data);
    },

    getSalesHistory() { return this.get(this.KEYS.SALES_HISTORY); },
    saveSalesHistory(data) { this.save(this.KEYS.SALES_HISTORY, data); },

    getRecipeTypes() { return this.get(this.KEYS.RECIPES_TYPES); },
    saveRecipeTypes(data) { this.save(this.KEYS.RECIPES_TYPES, data); },

    getStaff() {
        return this.get(this.KEYS.STAFF) || [];
    },

    saveStaff(data) {
        this.save(this.KEYS.STAFF, data);
    },

    getStaffBonuses() {
        return this.get(this.KEYS.STAFF_BONUSES) || [];
    },

    saveStaffBonuses(data) {
        this.save(this.KEYS.STAFF_BONUSES, data);
    },

    generateId(prefix) {
        return prefix + '_' + Math.random().toString(36).substr(2, 9);
    }
};
