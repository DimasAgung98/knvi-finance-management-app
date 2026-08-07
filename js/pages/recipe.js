window.app = window.app || {};

window.app.recipes = {
    data: [],
    builderRows: [],
    editId: null,
    
    init() {
        this.loadData();
        this.render();
        this.setupListeners();
    },

    loadData() {
        this.data = window.app.storage.getRecipes();
    },

    setupListeners() {
        const searchInput = document.getElementById('recipe-search');
        if(searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.render(e.target.value.toLowerCase());
            });
        }
    },

    render(searchQuery = '') {
        const listEl = document.getElementById('recipe-list');
        if(!listEl) return;

        listEl.innerHTML = '';
        
        const filteredData = this.data.filter(item => 
            item.name.toLowerCase().includes(searchQuery)
        );

        if (filteredData.length === 0) {
            listEl.innerHTML = `<div class="card" style="text-align:center; color: var(--text-muted);">No recipes found</div>`;
            return;
        }

        filteredData.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.padding = '16px';
            
            let ingredientsHtml = '';
            if(item.ingredients && item.ingredients.length > 0) {
                ingredientsHtml = `
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--border-color);">
                        <p style="font-weight: 600; margin-bottom: 8px;">Daftar Bahan:</p>
                        <table style="width: 100%; font-size: 0.9em;">
                            <thead>
                                <tr style="color: var(--text-secondary); text-align: left;">
                                    <th style="padding-bottom: 4px;">Bahan</th>
                                    <th style="padding-bottom: 4px;">Komposisi</th>
                                    <th style="padding-bottom: 4px; text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${item.ingredients.map(ing => `
                                    <tr>
                                        <td style="padding: 4px 0;">${ing.name}</td>
                                        <td style="padding: 4px 0;">${ing.usage}</td>
                                        <td style="padding: 4px 0; text-align: right;">${window.app.formatter.currency(ing.cost)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <div style="display: flex; justify-content: space-between; margin-top: 12px; padding: 12px; background: var(--bg-main); border-radius: var(--radius-sm);">
                            <div style="flex: 1;">
                                <div style="font-size: 0.85em; color: var(--text-secondary);">Total COGS</div>
                                <div style="font-weight: 600;">${window.app.formatter.currency(item.totalCost)}</div>
                            </div>
                            <div style="flex: 1; text-align: center; border-left: 1px solid var(--border-color); border-right: 1px solid var(--border-color); padding: 0 10px;">
                                <div style="font-size: 0.85em; color: var(--success-color);">Suggested Price</div>
                                <div style="font-weight: 600; color: var(--success-color);">${window.app.formatter.currency(item.suggestedPrice)}</div>
                            </div>
                            <div style="flex: 1; text-align: right;">
                                <div style="font-size: 0.85em; color: var(--primary-color);">Actual Price</div>
                                <div style="font-weight: 600; color: var(--primary-color);">${item.finalPrice > 0 ? window.app.formatter.currency(item.finalPrice) : '-'}</div>
                            </div>
                        </div>
                    </div>
                `;
            }

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="window.app.recipes.toggleDetails('${item.id}')">
                    <div>
                        <h4 style="margin: 0;">${item.name}</h4>
                        <div style="font-size: 0.85em; color: var(--text-secondary); margin-top: 4px;">
                            ${item.ingredients ? item.ingredients.length : 0} Items
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary" onclick="event.stopPropagation(); window.app.recipes.duplicate('${item.id}')" style="padding: 6px 12px;"><i class="ph ph-copy"></i> Duplicate</button>
                        <button class="btn btn-secondary" onclick="event.stopPropagation(); window.app.recipes.openBuilder('${item.id}')" style="padding: 6px 12px;"><i class="ph ph-pencil-simple"></i> Edit</button>
                        <button class="btn btn-secondary" onclick="event.stopPropagation(); window.app.recipes.delete('${item.id}')" style="padding: 6px 12px; color: var(--danger-color);"><i class="ph ph-trash"></i></button>
                        <i class="ph ph-caret-down" id="caret-${item.id}" style="margin-left: 8px; transition: transform 0.2s;"></i>
                    </div>
                </div>
                <div id="details-${item.id}" style="display: none;">
                    ${ingredientsHtml}
                </div>
            `;
            listEl.appendChild(card);
        });
    },

    toggleDetails(id) {
        const detailsEl = document.getElementById(`details-${id}`);
        const caretEl = document.getElementById(`caret-${id}`);
        if (detailsEl.style.display === 'none') {
            detailsEl.style.display = 'block';
            if(caretEl) caretEl.style.transform = 'rotate(180deg)';
        } else {
            detailsEl.style.display = 'none';
            if(caretEl) caretEl.style.transform = 'rotate(0deg)';
        }
    },

    printAllCheatSheets() {
        if (this.data.length === 0) {
            if(window.Swal) Swal.fire({ icon: 'info', title: 'No Recipes', text: 'Tidak ada resep untuk dicetak.' });
            return;
        }

        const container = document.getElementById('print-all-container');
        if (!container) return;

        let html = '';
        this.data.forEach((recipe, index) => {
            html += `
                <div style="margin-bottom: 24px; page-break-after: always; padding: 24px;">
                    <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #000; padding-bottom: 16px;">
                        <h2 style="margin: 0; font-size: 24px;">SOP BARISTA / CHEAT SHEET</h2>
                        <h1 style="margin: 8px 0 0 0; font-size: 32px;">${recipe.name}</h1>
                    </div>
                    
                    <table class="excel-table" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                        <thead>
                            <tr>
                                <th style="width: 50px; text-align: center; border: 1px solid #000; padding: 8px;">No</th>
                                <th style="width: 150px; border: 1px solid #000; padding: 8px; text-align: left;">Jenis</th>
                                <th style="border: 1px solid #000; padding: 8px; text-align: left;">Bahan/Packaging</th>
                                <th style="width: 150px; text-align: center; border: 1px solid #000; padding: 8px;">Komposisi</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${recipe.ingredients
                                .filter(ing => !(ing.category && ing.category.toLowerCase() === 'packaging'))
                                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                                .map((ing, i) => `
                                <tr>
                                    <td style="text-align: center; border: 1px solid #000; padding: 8px;">${i + 1}</td>
                                    <td style="border: 1px solid #000; padding: 8px;">Bahan</td>
                                    <td style="border: 1px solid #000; padding: 8px;">${ing.name}</td>
                                    <td style="text-align: center; border: 1px solid #000; padding: 8px; font-weight: bold; font-size: 1.1em;">${ing.usage} ${ing.buyUnit || ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        });

        container.innerHTML = html;
        container.classList.add('active-print');
        
        const recipeView = document.getElementById('recipe-list-view');
        if (recipeView) recipeView.classList.add('hide-on-print-all');

        window.print();

        // Cleanup after print dialog closes using event listener (crucial for mobile where print is async)
        const cleanup = () => {
            container.classList.remove('active-print');
            container.innerHTML = '';
            if (recipeView) recipeView.classList.remove('hide-on-print-all');
            window.removeEventListener('afterprint', cleanup);
        };
        
        window.addEventListener('afterprint', cleanup);
    },

    // --- Excel-Like Builder Logic ---

    openBuilder(recipeId = null) {
        document.getElementById('recipe-list-view').style.display = 'none';
        document.getElementById('recipe-builder-view').style.display = 'block';
        
        this.builderRows = [];
        this.editId = recipeId;
        
        const nameInput = document.getElementById('builder-recipe-name');
        
        if (recipeId) {
            const recipe = this.data.find(r => r.id === recipeId);
            if (recipe) {
                nameInput.value = recipe.name;
                // Deep copy ingredients
                this.builderRows = JSON.parse(JSON.stringify(recipe.ingredients));
                
                // Final Price
                const finalPriceInput = document.getElementById('builder-final-price');
                if(finalPriceInput) {
                    finalPriceInput.value = recipe.finalPrice ? window.app.formatter.number(recipe.finalPrice) : '';
                }
                
                const bufferInput = document.getElementById('builder-buffer-pct');
                if(bufferInput) {
                    bufferInput.value = recipe.bufferPct !== undefined ? recipe.bufferPct : 10;
                }
            }
        } else {
            nameInput.value = '';
            const finalPriceInput = document.getElementById('builder-final-price');
            if(finalPriceInput) finalPriceInput.value = '';
            const bufferInput = document.getElementById('builder-buffer-pct');
            if(bufferInput) bufferInput.value = 10;
            // Add one empty row to start
            this.addBuilderRow();
        }
        
        this.populateGlobalIngredientsList();
        this.renderBuilderTable();
    },

    populateGlobalIngredientsList() {
        const datalist = document.getElementById('global-ingredients-list');
        if (!datalist) return;
        const allIngredients = window.app.storage.getIngredients();
        let html = '';
        allIngredients.forEach(ing => {
            html += `<option value="${ing.name}"></option>`;
        });
        datalist.innerHTML = html;
    },

    closeBuilder() {
        document.getElementById('recipe-builder-view').style.display = 'none';
        document.getElementById('recipe-list-view').style.display = 'block';
    },

    addBuilderRow() {
        this.builderRows.push({
            id: '', 
            name: '', 
            category: '', 
            buyPrice: 0, 
            buyQty: 0, 
            buyUnit: '', 
            usage: 0, 
            cost: 0
        });
        this.renderBuilderTable();
    },

    removeBuilderRow(index) {
        this.builderRows.splice(index, 1);
        this.renderBuilderTable();
    },

    onIngredientSelect(index, inputElement) {
        const ingName = inputElement.value;
        const row = this.builderRows[index];
        
        if (ingName) {
            const ingredients = window.app.storage.getIngredients();
            const ing = ingredients.find(i => i.name.toLowerCase() === ingName.toLowerCase());
            if (ing) {
                row.id = ing.id;
                row.name = ing.name;
                row.category = ing.category;
                row.buyPrice = ing.buyPrice;
                row.buyQty = ing.qty;
                row.buyUnit = ing.unit;
            } else {
                row.id = '';
                row.name = ingName; // Leave it as text even if not found (will be invalid on save)
                row.category = '';
                row.buyPrice = 0;
                row.buyQty = 0;
                row.buyUnit = '';
            }
        } else {
            row.id = '';
            row.name = '';
            row.category = '';
            row.buyPrice = 0;
            row.buyQty = 0;
            row.buyUnit = '';
        }
        
        this.calculateRowCost(index);
        this.renderBuilderTable(); // Re-render to update dependent cells
    },

    onUsageChange(index, inputElement) {
        const row = this.builderRows[index];
        row.usage = parseFloat(inputElement.value) || 0;
        this.calculateRowCost(index);
        
        // Just update the total cost cell to avoid full re-render
        document.getElementById(`row-cost-${index}`).textContent = window.app.formatter.currency(row.cost);
        this.updateBuilderTotals();
    },

    calculateRowCost(index) {
        const row = this.builderRows[index];
        if (row.buyPrice > 0 && row.buyQty > 0 && row.usage > 0) {
            row.cost = (row.buyPrice / row.buyQty) * row.usage;
        } else {
            row.cost = 0;
        }
    },

    renderBuilderTable() {
        const tbody = document.getElementById('builder-table-body');
        const allIngredients = window.app.storage.getIngredients();
        
        let html = '';
        
        this.builderRows.forEach((row, index) => {
            // Build options for select
            let options = '<option value="">-- Pilih Bahan --</option>';
            allIngredients.forEach(ing => {
                options += `<option value="${ing.id}" ${row.id === ing.id ? 'selected' : ''}>${ing.name}</option>`;
            });
            
            // Format Jenis
            let jenis = row.category;
            if (jenis.toLowerCase() === 'packaging') {
                jenis = 'Packaging';
            } else if (jenis) {
                jenis = 'Bahan';
            }

            html += `
                <tr>
                    <td style="text-align: center;" class="readonly">${index + 1}</td>
                    <td class="readonly">${jenis || '-'}</td>
                    <td>
                        <input type="text" list="global-ingredients-list" class="form-control" placeholder="Ketik nama bahan..." value="${row.name || ''}" onchange="window.app.recipes.onIngredientSelect(${index}, this)">
                    </td>
                    <td>
                        <input type="number" min="0" step="0.01" value="${row.usage || ''}" oninput="window.app.recipes.onUsageChange(${index}, this)" placeholder="0">
                    </td>
                    <td class="readonly hide-print" style="text-align: right;">${window.app.formatter.currency(row.buyPrice)}</td>
                    <td class="readonly" style="text-align: right;">${row.buyQty || '-'}</td>
                    <td class="readonly" style="text-align: left;">${row.buyUnit || '-'}</td>
                    <td class="readonly hide-print" style="text-align: right;" id="row-cost-${index}">
                        <strong>${window.app.formatter.currency(row.cost)}</strong>
                    </td>
                    <td style="text-align: center;" class="hide-print">
                        <button type="button" onclick="window.app.recipes.removeBuilderRow(${index})" style="color: var(--danger-color); padding: 4px;">
                            <i class="ph ph-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        if (this.builderRows.length === 0) {
            html = `<tr><td colspan="9" style="text-align:center; padding: 20px; color: var(--text-muted);">Belum ada bahan ditambahkan. Klik tombol Tambah Bahan.</td></tr>`;
        }
        
        tbody.innerHTML = html;
        this.updateBuilderTotals();
    },

    updateBuilderTotals() {
        const rawCogs = this.builderRows.reduce((sum, row) => sum + (row.cost || 0), 0);
        
        const bufferInput = document.getElementById('builder-buffer-pct');
        const bufferPct = bufferInput ? (parseFloat(bufferInput.value) || 0) : 10;
        const bufferAmount = rawCogs * (bufferPct / 100);
        const finalCogs = rawCogs + bufferAmount;
        
        const minPrice = window.app.calculator.minimumPrice(finalCogs);
        const recPrice = window.app.calculator.recommendedPrice(finalCogs);
        
        document.getElementById('builder-total-cogs').textContent = window.app.formatter.currency(rawCogs);
        
        const finalCogsEl = document.getElementById('builder-final-cogs');
        if (finalCogsEl) finalCogsEl.textContent = window.app.formatter.currency(finalCogs);
        
        document.getElementById('builder-min-price').textContent = window.app.formatter.currency(minPrice);
        document.getElementById('builder-rec-price').textContent = window.app.formatter.currency(recPrice);
        
        this.updateProfitAnalysis(finalCogs);
    },

    updateProfitAnalysis(cogs = null) {
        if (cogs === null) {
            const rawCogs = this.builderRows.reduce((sum, row) => sum + (row.cost || 0), 0);
            const bufferInput = document.getElementById('builder-buffer-pct');
            const bufferPct = bufferInput ? (parseFloat(bufferInput.value) || 0) : 10;
            const bufferAmount = rawCogs * (bufferPct / 100);
            cogs = rawCogs + bufferAmount;
        }
        
        const finalPriceInput = document.getElementById('builder-final-price');
        const finalPrice = window.app.formatter.unformatInput(finalPriceInput.value) || 0;
        
        const fcEl = document.getElementById('builder-food-cost-pct');
        const gpEl = document.getElementById('builder-gross-profit');
        const marginEl = document.getElementById('builder-gross-margin');
        
        if (finalPrice <= 0) {
            fcEl.textContent = '0%';
            fcEl.style.color = 'var(--text-main)';
            gpEl.textContent = 'Rp 0';
            marginEl.textContent = '0%';
            marginEl.style.color = 'var(--text-main)';
            return;
        }
        
        const fcPct = (cogs / finalPrice) * 100;
        const grossProfit = finalPrice - cogs;
        const marginPct = (grossProfit / finalPrice) * 100;
        
        fcEl.textContent = fcPct.toFixed(1) + '%';
        fcEl.style.color = fcPct <= 30 ? 'var(--success-color)' : (fcPct <= 35 ? 'var(--warning-color)' : 'var(--danger-color)');
        
        gpEl.textContent = window.app.formatter.currency(grossProfit);
        
        marginEl.textContent = marginPct.toFixed(1) + '%';
        marginEl.style.color = marginPct >= 70 ? 'var(--success-color)' : (marginPct >= 65 ? 'var(--warning-color)' : 'var(--danger-color)');
    },

    saveBuilder() {
        const name = document.getElementById('builder-recipe-name').value.trim();
        
        if (!name) {
            window.app.toast.show('Recipe name is required!', 'error');
            return;
        }
        const invalidCount = this.builderRows.filter(r => !r.id && r.name).length;
        if (invalidCount > 0) {
            window.app.toast.show('Ada bahan yang tidak valid/tidak ditemukan. Silakan pilih dari daftar (dropdown).', 'error');
            return;
        }

        const validIngredients = this.builderRows.filter(r => r.id && r.usage > 0);
        
        if (validIngredients.length === 0) {
            window.app.toast.show('Please add at least one ingredient with usage > 0.', 'error');
            return;
        }

        const rawCogs = validIngredients.reduce((sum, row) => sum + row.cost, 0);
        const bufferInput = document.getElementById('builder-buffer-pct');
        const bufferPct = bufferInput ? (parseFloat(bufferInput.value) || 0) : 10;
        const bufferAmount = rawCogs * (bufferPct / 100);
        const totalCost = rawCogs + bufferAmount;
        
        // Default target FC to 30% for recipes saved via this builder
        const targetFc = 30; 
        const suggestedPrice = window.app.calculator.recommendedPrice(totalCost);
        const finalPriceInput = document.getElementById('builder-final-price');
        const finalPrice = window.app.formatter.unformatInput(finalPriceInput.value) || 0;

        const recipeToSave = {
            id: this.editId || window.app.storage.generateId('rec'),
            name,
            ingredients: validIngredients,
            totalCost, // final cogs with buffer
            rawCogs, // without buffer
            bufferPct,
            targetFc,
            suggestedPrice,
            finalPrice
        };

        // Fetch latest data to prevent race conditions across tabs/devices
        this.data = window.app.storage.getRecipes();

        if (this.editId) {
            const index = this.data.findIndex(r => r.id === this.editId);
            if (index !== -1) {
                this.data[index] = recipeToSave;
            } else {
                this.data.push(recipeToSave);
            }
        } else {
            this.data.push(recipeToSave);
        }

        window.app.storage.saveRecipes(this.data);
        
        this.render();
        this.closeBuilder();
        window.app.toast.show('Recipe saved successfully!');
        
        // Refresh other views
        if(window.app.dashboard) window.app.dashboard.render();
        if(window.app.pricing) window.app.pricing.render();
    },

    delete(id) {
        window.app.toast.confirm(
            'Delete Recipe?', 
            'Are you sure you want to delete this recipe?'
        ).then((result) => {
            if (result.isConfirmed) {
                this.data = window.app.storage.getRecipes();
                this.data = this.data.filter(item => item.id !== id);
                window.app.storage.saveRecipes(this.data);
                this.render();
                window.app.toast.show('Recipe deleted.');
                if(window.app.dashboard) window.app.dashboard.render();
                if(window.app.pricing) window.app.pricing.render();
            }
        });
    },

    duplicate(id) {
        const recipeToCopy = this.data.find(r => r.id === id);
        if (!recipeToCopy) return;

        // Deep copy the recipe
        const newRecipe = JSON.parse(JSON.stringify(recipeToCopy));
        
        newRecipe.id = window.app.storage.generateId('rec');
        newRecipe.name = 'Copy of ' + newRecipe.name;
        
        this.data = window.app.storage.getRecipes();
        this.data.push(newRecipe);
        window.app.storage.saveRecipes(this.data);
        
        this.render();
        window.app.toast.show('Recipe duplicated successfully!');
        
        if (window.app.dashboard) window.app.dashboard.render();
        if (window.app.pricing) window.app.pricing.render();
        if (window.app.profit) window.app.profit.render();
    }
};
