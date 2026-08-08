window.app = window.app || {};

window.app.calculator = {
    costPerUnit(buyPrice, qty) {
        if (!buyPrice || !qty || qty <= 0) return 0;
        return buyPrice / qty;
    },

    recipeCost(ingredientsList) {
        if (!ingredientsList || ingredientsList.length === 0) return 0;
        return ingredientsList.reduce((sum, item) => sum + (item.cost || 0), 0);
    },

    foodCostPercentage(cogs, sellingPrice) {
        if (!sellingPrice || sellingPrice <= 0) return 0;
        return (cogs / sellingPrice) * 100;
    },

    grossProfit(cogs, sellingPrice) {
        return sellingPrice - cogs;
    },

    marginPercentage(grossProfit, sellingPrice) {
        if (!sellingPrice || sellingPrice <= 0) return 0;
        return (grossProfit / sellingPrice) * 100;
    },
    
    breakEvenPrice(cogs, targetFoodCostPercent) {
        if (!targetFoodCostPercent || targetFoodCostPercent <= 0) return 0;
        return cogs / (targetFoodCostPercent / 100);
    },

    // F&B Industry Standards for Pricing
    minimumPrice(cogs) {
        // Target 35% Food Cost (Maximum allowed usually to avoid loss)
        return cogs / 0.35;
    },

    recommendedPrice(cogs) {
        // Target 30% Food Cost (Industry standard for Coffee Shop / F&B)
        return cogs / 0.30;
    },

    premiumPrice(cogs) {
        // Target 20% Food Cost (For signature items, high margin)
        return cogs / 0.20;
    },
    
    roundPsychological(price) {
        const rounded = Math.ceil(price / 1000) * 1000;
        return rounded - 100; // e.g. 34.900
    },

    cascadeUpdates() {
        if (!window.app || !window.app.storage) return;

        let ingredients = window.app.storage.getIngredients();
        let recipes = window.app.storage.getRecipes();

        // Pass 1 & 2: Update Premixes (2 passes for nested premixes)
        for (let pass = 0; pass < 2; pass++) {
            ingredients.forEach(premix => {
                if (premix.isPremix && premix.premixIngredients) {
                    let totalCogs = 0;
                    // Filter out any ingredients that no longer exist (were deleted)
                    premix.premixIngredients = premix.premixIngredients.filter(row => {
                        const latestIng = ingredients.find(i => i.id === row.id);
                        if (!latestIng) return false; // Remove deleted ingredient
                        
                        row.name = latestIng.name;
                        row.category = latestIng.category;
                        row.buyPrice = latestIng.buyPrice;
                        row.buyQty = latestIng.qty;
                        row.buyUnit = latestIng.unit;
                        
                        if (row.buyPrice > 0 && row.buyQty > 0 && row.usage > 0) {
                            row.cost = (row.buyPrice / row.buyQty) * row.usage;
                        } else {
                            row.cost = 0;
                        }
                        
                        totalCogs += (row.cost || 0);
                        return true;
                    });
                    
                    premix.buyPrice = totalCogs;
                    premix.costPerUnit = this.costPerUnit(premix.buyPrice, premix.qty);
                }
            });
        }
        window.app.storage.saveIngredients(ingredients);

        // Pass 3: Update Recipes
        recipes.forEach(recipe => {
            if (recipe.ingredients) {
                let rawCogs = 0;
                // Filter out any ingredients that no longer exist (were deleted)
                recipe.ingredients = recipe.ingredients.filter(row => {
                    const latestIng = ingredients.find(i => i.id === row.id);
                    if (!latestIng) return false; // Remove deleted ingredient
                    
                    row.name = latestIng.name;
                    row.category = latestIng.category;
                    row.buyPrice = latestIng.buyPrice;
                    row.buyQty = latestIng.qty;
                    row.buyUnit = latestIng.unit;
                    
                    if (row.buyPrice > 0 && row.buyQty > 0 && row.usage > 0) {
                        row.cost = (row.buyPrice / row.buyQty) * row.usage;
                    } else {
                        row.cost = 0;
                    }
                    
                    rawCogs += (row.cost || 0);
                    return true;
                });
                
                recipe.rawCogs = rawCogs;
                
                const bufferPct = recipe.bufferPct !== undefined ? recipe.bufferPct : 10;
                const bufferAmount = rawCogs * (bufferPct / 100);
                const totalCost = rawCogs + bufferAmount;
                
                recipe.totalCost = totalCost;
                recipe.suggestedPrice = this.recommendedPrice(totalCost);
                // finalPrice remains what the user typed manually
            }
        });
        window.app.storage.saveRecipes(recipes);

        // Re-render active views to reflect changes immediately
        if (window.app.dashboard) window.app.dashboard.render();
        if (window.app.recipes) {
            window.app.recipes.loadData();
            window.app.recipes.render();
        }
        if (window.app.ingredients) {
            window.app.ingredients.loadData();
            window.app.ingredients.render();
        }
        if (window.app.profit) window.app.profit.render();
        if (window.app.pricing) window.app.pricing.render();
    }
};
