window.app = window.app || {};

window.app.menu = {
    init() {
        this.render();
    },

    render() {
        const container = document.getElementById('digital-menu-container');
        if (!container) return;

        const recipes = window.app.storage.getRecipes();
        const types = window.app.storage.getRecipeTypes();

        if (recipes.length === 0) {
            container.innerHTML = `<div class="card" style="text-align:center; padding: 40px; color: var(--text-muted);">Belum ada resep. Buat resep terlebih dahulu untuk melihat menu.</div>`;
            return;
        }

        // Group recipes by category
        const categorized = {};
        recipes.forEach(recipe => {
            const cat = recipe.category || 'Uncategorized';
            if (!categorized[cat]) categorized[cat] = [];
            categorized[cat].push(recipe);
        });

        // Sort categories to ensure defined types come first, then 'Uncategorized' at the end
        const sortedCategories = Object.keys(categorized).sort((a, b) => {
            if (a === 'Uncategorized') return 1;
            if (b === 'Uncategorized') return -1;
            return a.localeCompare(b);
        });

        let html = '';

        sortedCategories.forEach(cat => {
            html += `
                <div style="margin-bottom: 32px; page-break-inside: avoid;">
                    <h3 style="margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid var(--primary-color); display: inline-block;">${cat}</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
            `;

            const catRecipes = categorized[cat].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            catRecipes.forEach(recipe => {
                const desc = this.generateDescription(recipe);
                const price = recipe.finalPrice > 0 ? window.app.formatter.currency(recipe.finalPrice) : window.app.formatter.currency(recipe.suggestedPrice || 0);
                
                html += `
                    <div class="card" style="padding: 16px; border-radius: var(--radius-md); box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid var(--border-color); display: flex; flex-direction: column; height: 100%;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                            <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-main); font-weight: 700;">${recipe.name}</h4>
                            <span style="font-weight: 700; color: var(--primary-color); font-size: 1.05rem; white-space: nowrap; margin-left: 12px;">${price}</span>
                        </div>
                        <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; flex-grow: 1;">
                            ${desc}
                        </p>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    generateDescription(recipe) {
        if (!recipe.ingredients || recipe.ingredients.length === 0) return 'Belum ada komposisi';

        // Filter out packaging
        const foodIngredients = recipe.ingredients.filter(ing => {
            const cat = (ing.category || '').toLowerCase();
            return cat !== 'packaging' && cat !== 'kemasan';
        });

        if (foodIngredients.length === 0) return '';

        // Extract names
        const names = foodIngredients.map(ing => ing.name).filter(Boolean);
        
        if (names.length === 0) return '';
        
        return names.join(', ');
    }
};
