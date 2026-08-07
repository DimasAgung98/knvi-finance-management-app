window.app = window.app || {};

window.app.pricing = {
    init() {
        this.render();
        this.setupListeners();
    },

    setupListeners() {
        const select = document.getElementById('pricing-recipe-select');
        if(select) {
            select.addEventListener('change', (e) => {
                this.calculatePricing(e.target.value);
            });
        }
    },

    render() {
        const select = document.getElementById('pricing-recipe-select');
        const recipes = window.app.storage.getRecipes();
        
        if(!select) return;

        const currentVal = select.value;
        
        select.innerHTML = '<option value="">-- Choose Recipe --</option>';
        recipes.forEach(r => {
            const priceStr = r.finalPrice > 0 ? ` - [${window.app.formatter.currency(r.finalPrice)}]` : '';
            select.innerHTML += `<option value="${r.id}">${r.name}${priceStr}</option>`;
        });

        if(currentVal && recipes.find(r => r.id === currentVal)) {
            select.value = currentVal;
            this.calculatePricing(currentVal);
        } else {
            document.getElementById('pricing-results').innerHTML = '';
        }
    },

    calculatePricing(recipeId) {
        const resultsEl = document.getElementById('pricing-results');
        if (!recipeId) {
            resultsEl.innerHTML = '';
            return;
        }

        const recipes = window.app.storage.getRecipes();
        const recipe = recipes.find(r => r.id === recipeId);
        
        if(!recipe) return;

        const cogs = recipe.totalCost;
        
        const minPrice = window.app.calculator.minimumPrice(cogs);
        const recPrice = window.app.calculator.recommendedPrice(cogs);
        const premiumPrice = window.app.calculator.premiumPrice(cogs);
        
        const roundedPrice = window.app.calculator.roundPsychological(recPrice);

        const finalPrice = recipe.finalPrice || 0;
        let finalPriceRow = '';
        if (finalPrice > 0) {
            const actualFc = (cogs / finalPrice) * 100;
            const actualGp = finalPrice - cogs;
            const actualMargin = (actualGp / finalPrice) * 100;
            const statusColor = actualMargin >= 70 ? 'var(--success-color)' : (actualMargin >= 65 ? 'var(--warning-color)' : 'var(--danger-color)');
            
            finalPriceRow = `
                <tr style="background: rgba(252, 196, 25, 0.1);">
                    <td><strong style="color: var(--primary-color);">Actual Selling Price</strong><br><small>Harga Jual Aktual Anda</small></td>
                    <td style="color: ${statusColor}; font-weight: bold;">${actualFc.toFixed(2)}%</td>
                    <td style="color: var(--primary-color);"><strong>${window.app.formatter.currency(finalPrice)}</strong></td>
                    <td style="color: ${actualGp > 0 ? 'var(--success-color)' : 'var(--danger-color)'};"><strong>${window.app.formatter.currency(actualGp)}</strong></td>
                    <td style="color: ${statusColor}; font-weight: bold;">${actualMargin.toFixed(2)}%</td>
                </tr>
            `;
        }

        resultsEl.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="card">
                    <h4>Cost Information</h4>
                    <p>Total COGS: <strong>${window.app.formatter.currency(cogs)}</strong></p>
                    <p style="font-size: 0.9em; color: var(--text-secondary); margin-top: 10px;">
                        Standard F&B Coffee Shop target Food Cost is 30%.
                    </p>
                </div>
                
                <div class="card" style="background-color: var(--primary-color); color: white;">
                    <h4>Recommended Price</h4>
                    <p style="font-size: 2rem; font-weight: bold; margin-top: 10px;">${window.app.formatter.currency(roundedPrice)}</p>
                    <p style="font-size: 0.9em; opacity: 0.8;">Based on 30% FC standard (Psychological Pricing)</p>
                </div>
            </div>
            
            <table style="margin-top:20px; width:100%; border:1px solid var(--border-color);">
                <thead>
                    <tr style="background:var(--secondary-color);">
                        <th>Scenario (F&B Standard)</th>
                        <th>Target FC %</th>
                        <th>Calculated Price</th>
                        <th>Gross Profit</th>
                        <th>Margin %</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Minimum Price</strong><br><small>Batas wajar agar operasional tercover</small></td>
                        <td style="color:var(--danger-color);">35.00%</td>
                        <td>${window.app.formatter.currency(minPrice)}</td>
                        <td>${window.app.formatter.currency(minPrice - cogs)}</td>
                        <td>65.00%</td>
                    </tr>
                    <tr style="background: rgba(43, 138, 62, 0.1);">
                        <td><strong>Ideal / Recommended</strong><br><small>Standard Coffee Shop / F&B</small></td>
                        <td><strong>30.00%</strong></td>
                        <td><strong>${window.app.formatter.currency(recPrice)}</strong></td>
                        <td><strong>${window.app.formatter.currency(recPrice - cogs)}</strong></td>
                        <td><strong>70.00%</strong></td>
                    </tr>
                    <tr>
                        <td><strong>Premium Price</strong><br><small>Untuk menu andalan / Signature</small></td>
                        <td style="color:var(--success-color);">20.00%</td>
                        <td>${window.app.formatter.currency(premiumPrice)}</td>
                        <td>${window.app.formatter.currency(premiumPrice - cogs)}</td>
                        <td>80.00%</td>
                    </tr>
                    ${finalPriceRow}
                </tbody>
            </table>
        `;
    }
};
