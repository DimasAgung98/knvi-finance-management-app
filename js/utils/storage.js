window.app = window.app || {};

window.app.storage = {
    KEYS: {
        INGREDIENTS: 'hpp_ingredients',
        RECIPES: 'hpp_recipes',
        SETTINGS: 'hpp_settings',
        OPEX: 'hpp_opex',
        PROJECTIONS: 'hpp_projections',
        SALES_HISTORY: 'hpp_sales_history',
        DAILY_EXPENSES: 'hpp_daily_expenses'
    },

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
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch (e) {
            return [];
        }
    },

    save(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
        this.pushToFirebase(key, data);
    },

    pushToFirebase(key, data) {
        if (!window.app.firebase) return;
        const { db, doc, setDoc } = window.app.firebase;
        const docRef = doc(db, 'kanovi_data', key);
        setDoc(docRef, { data: data }).catch(err => console.error("Firebase push error:", err));
    },

    async initFirebaseSync() {
        if (!window.app.firebase) return;
        const { db, doc, getDoc, setDoc, onSnapshot } = window.app.firebase;
        
        const keys = Object.values(this.KEYS);
        
        for (const key of keys) {
            const docRef = doc(db, 'kanovi_data', key);
            try {
                const docSnap = await getDoc(docRef);
                
                if (!docSnap.exists()) {
                    // Migration phase: If Firebase is empty, upload LocalStorage data
                    const localData = this.get(key);
                    let hasData = false;
                    if (Array.isArray(localData) && localData.length > 0) hasData = true;
                    else if (!Array.isArray(localData) && Object.keys(localData).length > 0) hasData = true;
                    
                    if (hasData) {
                        console.log(`Migrating ${key} to Firebase...`);
                        await setDoc(docRef, { data: localData });
                    }
                }
                
                // Set up real-time listener
                onSnapshot(docRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const remoteData = snapshot.data().data;
                        const localDataStr = localStorage.getItem(key);
                        const remoteDataStr = JSON.stringify(remoteData);
                        
                        if (localDataStr !== remoteDataStr) {
                            console.log(`Syncing ${key} from Firebase...`);
                            localStorage.setItem(key, remoteDataStr);
                            // Notify UI to refresh
                            window.dispatchEvent(new Event('firebase_sync_updated'));
                        }
                    }
                });
            } catch (err) {
                console.error(`Firebase sync error for ${key}:`, err);
            }
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
        return this.get(this.KEYS.DAILY_EXPENSES);
    },

    saveDailyExpenses(data) {
        this.save(this.KEYS.DAILY_EXPENSES, data);
    },

    getSalesHistory() { return this.get(this.KEYS.SALES_HISTORY); },
    saveSalesHistory(data) { this.save(this.KEYS.SALES_HISTORY, data); },

    generateId(prefix) {
        return prefix + '_' + Math.random().toString(36).substr(2, 9);
    }
};
