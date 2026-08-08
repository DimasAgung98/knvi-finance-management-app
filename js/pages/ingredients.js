window.app = window.app || {};

window.app.ingredients = {
    data: [],
    editId: null,
    premixBuilderRows: [],
    
    init() {
        this.loadData();
        this.populateFilter();
        this.render();
        this.setupListeners();
    },

    loadData() {
        this.data = window.app.storage.getIngredients();
    },

    populateFilter() {
        const filter = document.getElementById('ingredient-category-filter');
        if(!filter) return;
        
        const categories = [...new Set(this.data.map(item => item.category))].filter(Boolean);
        filter.innerHTML = '<option value="">All Categories</option>';
        categories.forEach(c => {
            filter.innerHTML += `<option value="${c}">${c}</option>`;
        });
    },

    setupListeners() {
        const searchInput = document.getElementById('ingredient-search');
        const filterSelect = document.getElementById('ingredient-category-filter');
        
        const updateList = () => {
            this.render(searchInput.value.toLowerCase(), filterSelect.value);
        };

        if(searchInput) searchInput.addEventListener('input', updateList);
        if(filterSelect) filterSelect.addEventListener('change', updateList);
    },

    render(searchQuery = '', categoryFilter = '') {
        const listEl = document.getElementById('ingredient-list');
        if(!listEl) return;

        listEl.innerHTML = '';
        
        const filteredData = this.data.filter(item => {
            const matchSearch = item.name.toLowerCase().includes(searchQuery) || item.category.toLowerCase().includes(searchQuery);
            const matchCategory = categoryFilter === '' || item.category === categoryFilter;
            return matchSearch && matchCategory;
        });

        if (filteredData.length === 0) {
            listEl.innerHTML = `<div class="card" style="text-align:center; color: var(--text-muted);">No ingredients found</div>`;
            return;
        }

        filteredData.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.padding = '16px';
            
            let detailsHtml = '';
            let isExpandable = item.isPremix && item.premixIngredients && item.premixIngredients.length > 0;
            
            if (isExpandable) {
                detailsHtml = `
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--border-color);">
                        <p style="font-weight: 600; margin-bottom: 8px;">Bahan Penyusun Racikan:</p>
                        <table style="width: 100%; font-size: 0.9em;">
                            <thead>
                                <tr style="color: var(--text-secondary); text-align: left;">
                                    <th style="padding-bottom: 4px;">Bahan</th>
                                    <th style="padding-bottom: 4px;">Komposisi</th>
                                    <th style="padding-bottom: 4px; text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${item.premixIngredients.map(ing => `
                                    <tr>
                                        <td style="padding: 4px 0;">${ing.name}</td>
                                        <td style="padding: 4px 0;">${ing.usage}</td>
                                        <td style="padding: 4px 0; text-align: right;">${window.app.formatter.currency(ing.cost)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <div style="display: flex; justify-content: space-between; margin-top: 12px; padding: 12px; background: var(--bg-main); border-radius: var(--radius-sm);">
                            <div>
                                <div style="font-size: 0.85em; color: var(--text-secondary);">Total Biaya Racikan</div>
                                <div style="font-weight: 600;">${window.app.formatter.currency(item.buyPrice)}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.85em; color: var(--text-secondary);">Cost per Unit (${item.unit})</div>
                                <div style="font-weight: 600; color: var(--primary-color);">${window.app.formatter.currency(item.costPerUnit)}</div>
                            </div>
                        </div>
                    </div>
                `;
            }

            const typeLabel = item.isPremix 
                ? `<span style="background:var(--primary-color); color:white; padding: 4px 8px; border-radius: 4px; font-size: 0.75em; font-weight: bold; margin-left: 8px;">PREMIX</span>`
                : '';

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; ${isExpandable ? 'cursor: pointer;' : ''}" ${isExpandable ? `onclick="window.app.ingredients.toggleDetails('${item.id}')"` : ''}>
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 16px; align-items: center; flex: 1;">
                        <div>
                            <div style="display: flex; align-items: center;">
                                <h4 style="margin: 0;">${item.name}</h4>
                                ${typeLabel}
                            </div>
                            <div style="font-size: 0.85em; color: var(--text-secondary); margin-top: 4px;">
                                <span style="background:var(--secondary-color); padding: 2px 6px; border-radius: 4px;">${item.category}</span>
                                ${item.supplier ? `<span style="background:var(--bg-main); border: 1px solid var(--border-color); padding: 2px 6px; border-radius: 4px; margin-left: 6px;"><i class="ph ph-storefront"></i> ${item.supplier}</span>` : ''}
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 0.8em; color: var(--text-secondary);">Buy Price</div>
                            <div style="font-weight: 500;">${window.app.formatter.currency(item.buyPrice)}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.8em; color: var(--text-secondary);">Qty & Unit</div>
                            <div style="font-weight: 500;">${item.qty} ${item.unit}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.8em; color: var(--text-secondary);">Cost / Unit</div>
                            <div style="font-weight: 600; color: var(--primary-color);">${window.app.formatter.currency(item.costPerUnit)}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; margin-left: 16px;">
                        <button class="btn btn-secondary" onclick="event.stopPropagation(); window.app.ingredients.${item.isPremix ? 'openPremixBuilder' : 'openModal'}('${item.id}')" style="padding: 6px 12px;"><i class="ph ph-pencil-simple"></i> Edit</button>
                        <button class="btn btn-secondary" onclick="event.stopPropagation(); window.app.ingredients.delete('${item.id}')" style="padding: 6px 12px; color: var(--danger-color);"><i class="ph ph-trash"></i></button>
                        ${isExpandable ? `<i class="ph ph-caret-down" id="caret-ing-${item.id}" style="margin-left: 8px; transition: transform 0.2s;"></i>` : ''}
                    </div>
                </div>
                ${isExpandable ? `<div id="details-ing-${item.id}" style="display: none;">${detailsHtml}</div>` : ''}
            `;
            listEl.appendChild(card);
        });
    },

    toggleDetails(id) {
        const detailsEl = document.getElementById(`details-ing-${id}`);
        const caretEl = document.getElementById(`caret-ing-${id}`);
        if(detailsEl) {
            if (detailsEl.style.display === 'none') {
                detailsEl.style.display = 'block';
                if(caretEl) caretEl.style.transform = 'rotate(180deg)';
            } else {
                detailsEl.style.display = 'none';
                if(caretEl) caretEl.style.transform = 'rotate(0deg)';
            }
        }
    },

    // --- Raw Ingredient Logic ---

    openModal(id = null) {
        this.editId = id;
        
        const categories = [...new Set(this.data.map(item => item.category))].filter(Boolean);
        const categoryOptions = categories.map(c => `<option value="${c}">`).join('');
        
        const existingUnits = [...new Set(this.data.map(item => item.unit))].filter(Boolean);
        const defaultUnits = ['gram', 'kg', 'ml', 'liter', 'pcs'];
        const allUnits = [...new Set([...defaultUnits, ...existingUnits])];
        const unitOptions = allUnits.map(u => `<option value="${u}">`).join('');

        let title = 'Add Raw Ingredient';
        let defaultValues = { name: '', category: '', buyPrice: '', qty: '', unit: '', supplier: '' };

        if (this.editId) {
            title = 'Edit Raw Ingredient';
            const existing = this.data.find(i => i.id === this.editId);
            if (existing) {
                defaultValues = { ...existing };
            }
        }

        const html = `
            <form id="ingredient-form" onsubmit="window.app.ingredients.saveRaw(event)">
                <div style="margin-bottom: 15px;">
                    <label style="display:block; margin-bottom:5px; font-weight:500;">Name</label>
                    <input type="text" id="ing-name" class="form-control" required value="${defaultValues.name}">
                </div>
                <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <label style="display:block; margin-bottom:5px; font-weight:500;">Category</label>
                        <input type="text" id="ing-category" class="form-control" required placeholder="e.g. Coffee, Dairy, Syrup..." list="category-list" value="${defaultValues.category}">
                        <datalist id="category-list">
                            ${categoryOptions}
                        </datalist>
                    </div>
                    <div style="flex: 1;">
                        <label style="display:block; margin-bottom:5px; font-weight:500;">Supplier <span style="font-size: 0.8em; font-weight: normal; color: var(--text-secondary);">(Optional)</span></label>
                        <input type="text" id="ing-supplier" class="form-control" placeholder="e.g. Toko Makmur" value="${defaultValues.supplier || ''}">
                    </div>
                </div>
                <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <label style="display:block; margin-bottom:5px; font-weight:500;">Buy Price (Rp)</label>
                        <input type="text" id="ing-price" class="form-control" required value="${defaultValues.buyPrice ? window.app.formatter.number(defaultValues.buyPrice) : ''}" oninput="window.app.formatter.formatInput(this)">
                    </div>
                    <div style="flex: 1;">
                        <label style="display:block; margin-bottom:5px; font-weight:500;">Quantity</label>
                        <input type="number" id="ing-qty" class="form-control" required min="0.01" step="0.01" value="${defaultValues.qty}">
                    </div>
                    <div style="flex: 1;">
                        <label style="display:block; margin-bottom:5px; font-weight:500;">Unit</label>
                        <input type="text" id="ing-unit" class="form-control" required placeholder="e.g. gram, ml" list="unit-list" value="${defaultValues.unit}">
                        <datalist id="unit-list">
                            ${unitOptions}
                        </datalist>
                    </div>
                </div>
                <div style="display:flex; justify-content:flex-end; gap: 10px; margin-top:20px;">
                    <button type="button" class="btn btn-secondary" onclick="window.app.modal.close()">Cancel</button>
                    <button type="submit" class="btn btn-primary"><i class="ph ph-floppy-disk"></i> Save Ingredient</button>
                </div>
            </form>
        `;
        window.app.modal.open(title, html);
    },

    saveRaw(event) {
        event.preventDefault();
        
        const name = document.getElementById('ing-name').value;
        const category = document.getElementById('ing-category').value;
        const supplier = document.getElementById('ing-supplier').value;
        const buyPrice = window.app.formatter.unformatInput(document.getElementById('ing-price').value);
        const qty = parseFloat(document.getElementById('ing-qty').value);
        const unit = document.getElementById('ing-unit').value;
        
        const costPerUnit = window.app.calculator.costPerUnit(buyPrice, qty);

        const ingredientData = {
            name,
            category,
            supplier,
            buyPrice,
            qty,
            unit,
            costPerUnit,
            isPremix: false
        };

        // Fetch latest data to prevent race conditions
        this.data = window.app.storage.getIngredients();

        if (this.editId) {
            const index = this.data.findIndex(i => i.id === this.editId);
            if (index !== -1) {
                this.data[index] = { ...this.data[index], ...ingredientData };
            }
        } else {
            ingredientData.id = window.app.storage.generateId('ing');
            this.data.push(ingredientData);
        }

        window.app.storage.saveIngredients(this.data);
        this.populateFilter();
        
        if (window.app.calculator && window.app.calculator.cascadeUpdates) {
            window.app.calculator.cascadeUpdates();
        } else {
            this.render();
        }
        
        window.app.modal.close();
        window.app.toast.show('Ingredient saved successfully!');
        
        if(window.app.dashboard) window.app.dashboard.render();
    },

    delete(id) {
        // Validation: Is this ingredient used in any recipes or premixes?
        const recipes = window.app.storage.getRecipes();
        let isUsed = false;
        recipes.forEach(r => {
            if(r.ingredients && r.ingredients.some(i => i.id === id)) isUsed = true;
        });

        this.data.forEach(i => {
            if(i.isPremix && i.premixIngredients && i.premixIngredients.some(pi => pi.id === id)) isUsed = true;
        });

        if (isUsed) {
            window.app.toast.show('Cannot delete: this ingredient is used in recipes or premixes.', 'error');
            return;
        }

        window.app.toast.confirm(
            'Delete Ingredient?', 
            'Are you sure you want to delete this ingredient?'
        ).then((result) => {
            if (result.isConfirmed) {
                this.data = window.app.storage.getIngredients();
                this.data = this.data.filter(item => item.id !== id);
                window.app.storage.saveIngredients(this.data);
                this.populateFilter();
                
                if (window.app.calculator && window.app.calculator.cascadeUpdates) {
                    window.app.calculator.cascadeUpdates();
                } else {
                    this.render();
                }
                
                window.app.toast.show('Ingredient deleted.');
                if(window.app.dashboard) window.app.dashboard.render();
            }
        });
    },

    // --- Premix Builder Logic ---

    openPremixBuilder(id = null) {
        document.getElementById('ingredient-list-view').style.display = 'none';
        document.getElementById('premix-builder-view').style.display = 'block';
        
        this.premixBuilderRows = [];
        this.editId = id;
        
        const nameInput = document.getElementById('builder-premix-name');
        const catInput = document.getElementById('builder-premix-category');
        const qtyInput = document.getElementById('builder-premix-yield-qty');
        const unitInput = document.getElementById('builder-premix-yield-unit');
        
        // Populate datalists for premix builder
        const categories = [...new Set(this.data.map(item => item.category))].filter(Boolean);
        document.getElementById('premix-category-list').innerHTML = categories.map(c => `<option value="${c}">`).join('');
        
        const existingUnits = [...new Set(this.data.map(item => item.unit))].filter(Boolean);
        const defaultUnits = ['gram', 'kg', 'ml', 'liter', 'pcs'];
        const allUnits = [...new Set([...defaultUnits, ...existingUnits])];
        document.getElementById('premix-unit-list').innerHTML = allUnits.map(u => `<option value="${u}">`).join('');

        if (id) {
            const existing = this.data.find(i => i.id === id);
            if (existing) {
                nameInput.value = existing.name;
                catInput.value = existing.category;
                qtyInput.value = existing.qty;
                unitInput.value = existing.unit;
                this.premixBuilderRows = JSON.parse(JSON.stringify(existing.premixIngredients || []));
            }
        } else {
            nameInput.value = '';
            catInput.value = 'Bahan Racikan';
            qtyInput.value = '';
            unitInput.value = '';
            this.addPremixRow();
        }
        
        this.populateGlobalIngredientsList();
        this.renderPremixBuilderTable();
    },

    populateGlobalIngredientsList() {
        const datalist = document.getElementById('global-ingredients-list');
        if (!datalist) return;
        let html = '';
        this.data.forEach(ing => {
            // Prevent self-selection
            if(this.editId && ing.id === this.editId) return;
            html += `<option value="${ing.name}"></option>`;
        });
        datalist.innerHTML = html;
    },

    closePremixBuilder() {
        document.getElementById('premix-builder-view').style.display = 'none';
        document.getElementById('ingredient-list-view').style.display = 'block';
    },

    addPremixRow() {
        this.premixBuilderRows.push({
            id: '', name: '', category: '', buyPrice: 0, buyQty: 0, buyUnit: '', usage: 0, cost: 0
        });
        this.renderPremixBuilderTable();
    },

    removePremixRow(index) {
        this.premixBuilderRows.splice(index, 1);
        this.renderPremixBuilderTable();
    },

    onPremixIngredientSelect(index, inputElement) {
        const ingName = inputElement.value;
        const row = this.premixBuilderRows[index];
        
        if (ingName) {
            const ing = this.data.find(i => i.name.toLowerCase() === ingName.toLowerCase());
            if (ing) {
                // Check for recursive premix selection to prevent infinite loops (if this is editing)
                if (this.editId && ing.id === this.editId) {
                    window.app.toast.show('Cannot select itself as an ingredient.', 'error');
                    inputElement.value = '';
                    return;
                }

                row.id = ing.id;
                row.name = ing.name;
                row.category = ing.category;
                row.buyPrice = ing.buyPrice;
                row.buyQty = ing.qty;
                row.buyUnit = ing.unit;
            } else {
                row.id = '';
                row.name = ingName;
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
        
        this.calculatePremixRowCost(index);
        this.renderPremixBuilderTable();
    },

    onPremixUsageChange(index, inputElement) {
        const row = this.premixBuilderRows[index];
        row.usage = parseFloat(inputElement.value) || 0;
        this.calculatePremixRowCost(index);
        
        const costEl = document.getElementById(`premix-row-cost-${index}`);
        if(costEl) costEl.textContent = window.app.formatter.currency(row.cost);
        this.updatePremixTotals();
    },

    calculatePremixRowCost(index) {
        const row = this.premixBuilderRows[index];
        if (row.buyPrice > 0 && row.buyQty > 0 && row.usage > 0) {
            row.cost = (row.buyPrice / row.buyQty) * row.usage;
        } else {
            row.cost = 0;
        }
    },

    renderPremixBuilderTable() {
        const tbody = document.getElementById('premix-builder-table-body');
        
        let html = '';
        
        this.premixBuilderRows.forEach((row, index) => {
            let options = '<option value="">-- Pilih Bahan --</option>';
            this.data.forEach(ing => {
                // Prevent self-selection
                if(this.editId && ing.id === this.editId) return; 
                options += `<option value="${ing.id}" ${row.id === ing.id ? 'selected' : ''}>${ing.name}</option>`;
            });

            let jenis = row.category;
            if (jenis && jenis.toLowerCase() === 'packaging') {
                jenis = 'Packaging';
            } else if (jenis) {
                jenis = 'Bahan';
            }

            html += `
                <tr>
                    <td style="text-align: center;" class="readonly">${index + 1}</td>
                    <td class="readonly">${jenis || '-'}</td>
                    <td>
                        <input type="text" list="global-ingredients-list" class="form-control" placeholder="Ketik nama bahan..." value="${row.name || ''}" onchange="window.app.ingredients.onPremixIngredientSelect(${index}, this)">
                    </td>
                    <td>
                        <input type="number" min="0" step="0.01" value="${row.usage || ''}" oninput="window.app.ingredients.onPremixUsageChange(${index}, this)" placeholder="0">
                    </td>
                    <td class="readonly" style="text-align: right;">${window.app.formatter.currency(row.buyPrice)}</td>
                    <td class="readonly" style="text-align: right;">${row.buyQty || '-'}</td>
                    <td class="readonly" style="text-align: left;">${row.buyUnit || '-'}</td>
                    <td class="readonly" style="text-align: right;" id="premix-row-cost-${index}">
                        <strong>${window.app.formatter.currency(row.cost)}</strong>
                    </td>
                    <td style="text-align: center;">
                        <button type="button" onclick="window.app.ingredients.removePremixRow(${index})" style="color: var(--danger-color); padding: 4px;">
                            <i class="ph ph-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        if (this.premixBuilderRows.length === 0) {
            html = `<tr><td colspan="9" style="text-align:center; padding: 20px; color: var(--text-muted);">Belum ada bahan ditambahkan.</td></tr>`;
        }
        
        tbody.innerHTML = html;
        this.updatePremixTotals();
    },

    updatePremixTotals() {
        const totalCogs = this.premixBuilderRows.reduce((sum, row) => sum + (row.cost || 0), 0);
        
        const totalCogsEl = document.getElementById('premix-total-cogs');
        if(totalCogsEl) totalCogsEl.textContent = window.app.formatter.currency(totalCogs);
        
        const yieldQty = parseFloat(document.getElementById('builder-premix-yield-qty').value) || 0;
        
        const costPerUnitEl = document.getElementById('premix-cost-per-unit');
        if(costPerUnitEl) {
            if (yieldQty > 0) {
                costPerUnitEl.textContent = window.app.formatter.currency(totalCogs / yieldQty);
            } else {
                costPerUnitEl.textContent = 'Rp 0';
            }
        }
    },

    savePremix() {
        const name = document.getElementById('builder-premix-name').value.trim();
        const category = document.getElementById('builder-premix-category').value.trim();
        const yieldQty = parseFloat(document.getElementById('builder-premix-yield-qty').value);
        const yieldUnit = document.getElementById('builder-premix-yield-unit').value.trim();
        
        if (!name || !category || !yieldQty || !yieldUnit) {
            window.app.toast.show('Name, Category, Yield Qty, and Unit are required!', 'error');
            return;
        }
        
        const invalidCount = this.premixBuilderRows.filter(r => !r.id && r.name).length;
        if (invalidCount > 0) {
            if(window.Swal) {
                Swal.fire({
                    icon: 'error',
                    title: 'Bahan Tidak Valid',
                    text: 'Ada bahan yang tidak dikenali. Pastikan Anda memilih bahan dari daftar yang tersedia.'
                });
            } else {
                window.app.toast.show('Ada bahan yang tidak valid.', 'error');
            }
            return;
        }

        const validIngredients = this.premixBuilderRows.filter(r => r.id && r.usage > 0);
        
        if (validIngredients.length === 0) {
            window.app.toast.show('Please add at least one ingredient with usage > 0.', 'error');
            return;
        }

        const totalCost = validIngredients.reduce((sum, row) => sum + row.cost, 0);
        const costPerUnit = totalCost / yieldQty;

        const premixData = {
            name,
            category,
            buyPrice: totalCost, // The total cost of raw materials acts as the "buy price" for the premix
            qty: yieldQty,
            unit: yieldUnit,
            costPerUnit: costPerUnit,
            isPremix: true,
            premixIngredients: validIngredients
        };

        // Fetch latest data to prevent race conditions across tabs/devices
        this.data = window.app.storage.getIngredients();

        if (this.editId) {
            const index = this.data.findIndex(r => r.id === this.editId);
            if (index !== -1) {
                this.data[index] = { ...this.data[index], ...premixData };
            } else {
                this.data.push(premixData);
            }
        } else {
            premixData.id = window.app.storage.generateId('ing');
            this.data.push(premixData);
        }

        window.app.storage.saveIngredients(this.data);
        
        this.populateFilter();
        this.render();
        this.closePremixBuilder();
        window.app.toast.show('Premix saved successfully!');
        
        // Use global cascade updates to sync all nested premixes and recipes
        if (window.app.calculator && window.app.calculator.cascadeUpdates) {
            window.app.calculator.cascadeUpdates();
        } else {
            if(window.app.dashboard) window.app.dashboard.render();
        }
    },

        // Removed old recalculateRecipesCost logic

    exportCsv() {
        const sep = "sep=;\n";
        const headers = "Name;Category;Supplier;Buy Price (Rp);Quantity;Unit\n";
        
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + sep + headers;
        
        this.data.filter(item => !item.isPremix).forEach(item => {
            const name = item.name ? item.name.replace(/;/g, ',') : '';
            const category = item.category ? item.category.replace(/;/g, ',') : '';
            const supplier = item.supplier ? item.supplier.replace(/;/g, ',') : '';
            const price = item.buyPrice || 0;
            const qty = item.qty || 1;
            const unit = item.unit ? item.unit.replace(/;/g, ',') : '';
            
            csvContent += `${name};${category};${supplier};${price};${qty};${unit}\n`;
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "hpp_ingredients_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    downloadCsvTemplate() {
        // Add sep=; to force Excel to recognize columns regardless of regional settings
        const sep = "sep=;\n";
        const headers = "Name;Category;Supplier;Buy Price (Rp);Quantity;Unit\n";
        const sampleRow1 = "Kopi Susu Blend;Coffee Beans;Toko Makmur;150000;1000;g\n";
        const sampleRow2 = "Fresh Milk;Dairy;;20000;1000;ml\n";
        
        // \uFEFF is the UTF-8 BOM which also helps Excel parse properly
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + sep + headers + sampleRow1 + sampleRow2;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "hpp_ingredients_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    handleCsvUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            this.parseCsv(text);
            event.target.value = ''; // reset input
        };
        reader.readAsText(file);
    },

    parseCsv(csvText) {
        const lines = csvText.split('\n');
        if (lines.length < 2) {
            Swal.fire({ icon: 'error', title: 'Invalid File', text: 'CSV file is empty.' });
            return;
        }
        
        let addedCount = 0;
        let updatedCount = 0;
        const delimiter = csvText.includes(';') ? ';' : ',';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Skip "sep=" meta tag or header rows
            if (line.toLowerCase().startsWith('sep=')) continue;
            if (line.toLowerCase().startsWith('name')) continue;
            
            // Regex to split CSV by delimiter while ignoring delimiters inside quotes
            const row = line.split(new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`)).map(s => s.replace(/(^"|"$)/g, '').trim());
            
            if (row.length < 5) continue;
            
            const name = row[0];
            const category = row[1];
            const type = 'raw'; 
            
            let supplier = '';
            let buyPrice = 0, qty = 1, unit = 'pcs';
            
            if (row.length === 5) {
                // Old template format without Supplier column
                buyPrice = parseFloat(row[2]) || 0;
                qty = parseFloat(row[3]) || 1;
                unit = row[4];
            } else {
                // New template format
                supplier = row[2];
                buyPrice = parseFloat(row[3]) || 0;
                qty = parseFloat(row[4]) || 1;
                unit = row[5];
            }
            
            if (!name) continue; // Name is mandatory
            
            const costPerUnit = window.app.calculator.costPerUnit(buyPrice, qty);
            
            const existingIndex = this.data.findIndex(item => item.name.toLowerCase() === name.toLowerCase());
            
            if (existingIndex !== -1) {
                // Update existing ingredient
                this.data[existingIndex].category = category || this.data[existingIndex].category;
                this.data[existingIndex].supplier = supplier || this.data[existingIndex].supplier;
                this.data[existingIndex].buyPrice = buyPrice;
                this.data[existingIndex].qty = qty;
                this.data[existingIndex].unit = unit || this.data[existingIndex].unit;
                this.data[existingIndex].costPerUnit = costPerUnit;
                
                updatedCount++;
            } else {
                // Insert new ingredient
                const newItem = {
                    id: window.app.storage.generateId('ing'),
                    type: type,
                    isPremix: false,
                    name: name,
                    category: category || 'Uncategorized',
                    supplier: supplier || '',
                    buyPrice: buyPrice,
                    qty: qty,
                    unit: unit || 'pcs',
                    costPerUnit: costPerUnit,
                    ingredients: []
                };
                
                this.data.push(newItem);
                addedCount++;
            }
        }
        
        if (addedCount > 0 || updatedCount > 0) {
            window.app.storage.saveIngredients(this.data);
            this.populateFilter();
            
            // Trigger cascading updates to sync recipes and nested premixes
            if (window.app.calculator && window.app.calculator.cascadeUpdates) {
                window.app.calculator.cascadeUpdates();
            } else {
                this.render();
                if(window.app.dashboard) window.app.dashboard.render();
            }
            
            window.app.toast.show(`Success! ${addedCount} added, ${updatedCount} updated.`);
        } else {
            Swal.fire({ icon: 'error', title: 'Import Failed', text: 'No valid ingredients data found in the CSV. Please check the template format.' });
        }
    }
};
