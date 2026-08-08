window.app = window.app || {};

window.app.recipes = {
    data: [],
    recipeTypes: [],
    activeCategory: '',
    builderRows: [],
    editId: null,
    
    init() {
        this.loadData();
        this.render();
        this.setupListeners();
    },

    loadData() {
        this.data = window.app.storage.getRecipes();
        this.recipeTypes = window.app.storage.getRecipeTypes();
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
        
        this.renderCategoryFilters();

        listEl.innerHTML = '';
        
        const filteredData = this.data.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery);
            const matchesCategory = this.activeCategory === '' || item.category === this.activeCategory;
            return matchesSearch && matchesCategory;
        });

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
                                ${[...item.ingredients].sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(ing => `
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
                        <button class="btn btn-secondary" onclick="event.stopPropagation(); window.app.recipes.openUpsizeModal('${item.id}')" style="padding: 6px 12px; color: var(--primary-color);"><i class="ph ph-trend-up"></i> Upsize</button>
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

    // --- Category Management & Filtering ---
    renderCategoryFilters() {
        const container = document.getElementById('recipe-category-filters');
        if(!container) return;
        
        let html = `<button class="btn ${this.activeCategory === '' ? 'btn-primary' : 'btn-secondary'}" style="border-radius: 20px; padding: 4px 12px; font-size: 0.9em;" onclick="window.app.recipes.setCategory('')">Semua</button>`;
        
        this.recipeTypes.forEach(type => {
            const isActive = this.activeCategory === type.name;
            html += `<button class="btn ${isActive ? 'btn-primary' : 'btn-secondary'}" style="border-radius: 20px; padding: 4px 12px; font-size: 0.9em;" onclick="window.app.recipes.setCategory('${type.name}')">${type.name}</button>`;
        });
        
        container.innerHTML = html;
    },

    setCategory(cat) {
        this.activeCategory = cat;
        this.render(document.getElementById('recipe-search') ? document.getElementById('recipe-search').value.toLowerCase() : '');
    },

    openCategoryManager() {
        const html = `
            <div style="margin-bottom: 16px; display: flex; gap: 8px;">
                <input type="text" id="new-category-name" class="form-control" placeholder="Nama Kategori Baru...">
                <button class="btn btn-primary" onclick="window.app.recipes.addCategory()"><i class="ph ph-plus"></i></button>
            </div>
            <div id="category-list-modal" style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto;">
                ${this.recipeTypes.map(t => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-main); border-radius: var(--radius-sm);">
                        <span>${t.name}</span>
                        <button class="btn" style="color: var(--danger-color); padding: 4px;" onclick="window.app.recipes.deleteCategory('${t.id}')"><i class="ph ph-trash"></i></button>
                    </div>
                `).join('')}
                ${this.recipeTypes.length === 0 ? '<div style="text-align: center; color: var(--text-muted); padding: 12px;">Belum ada kategori</div>' : ''}
            </div>
        `;
        window.app.modal.open('Kelola Kategori', html);
    },

    addCategory() {
        const nameInput = document.getElementById('new-category-name');
        const name = nameInput.value.trim();
        if(!name) return;
        
        if (this.recipeTypes.find(t => t.name.toLowerCase() === name.toLowerCase())) {
            window.app.toast.show('Kategori sudah ada!', 'error');
            return;
        }
        
        this.recipeTypes.push({
            id: window.app.storage.generateId('cat'),
            name: name
        });
        
        window.app.storage.saveRecipeTypes(this.recipeTypes);
        window.app.toast.show('Kategori ditambahkan');
        
        this.renderCategoryFilters();
        this.openCategoryManager(); // Refresh modal
    },

    deleteCategory(id) {
        if(!window.Swal) return;
        Swal.fire({
            title: 'Hapus Kategori?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#fa5252',
            confirmButtonText: 'Ya, hapus!'
        }).then((result) => {
            if (result.isConfirmed) {
                this.recipeTypes = this.recipeTypes.filter(t => t.id !== id);
                window.app.storage.saveRecipeTypes(this.recipeTypes);
                
                if (this.activeCategory && !this.recipeTypes.find(t => t.name === this.activeCategory)) {
                    this.activeCategory = '';
                }
                
                this.render();
                this.openCategoryManager(); // Refresh modal
                window.app.toast.show('Kategori dihapus');
            }
        });
    },

    // --- Upsize Logic ---
    openUpsizeModal(recipeId) {
        const recipe = this.data.find(r => r.id === recipeId);
        if (!recipe) return;

        let html = `
            <div style="margin-bottom: 16px;">
                <p style="color: var(--text-secondary); margin: 0 0 16px 0; font-size: 0.9em;">
                    Sistem akan membuat salinan resep <b>${recipe.name} (Upsize)</b>. Silakan periksa atau ubah angka tambahan takaran untuk tiap bahan di bawah ini:
                </p>
                <form id="upsize-form" onsubmit="window.app.recipes.generateUpsize(event, '${recipeId}')">
                    <div style="max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
        `;

        const ingredientsList = recipe.ingredients || [];
        const allIngredients = window.app.storage.getIngredients();
        const packagingItems = allIngredients.filter(i => (i.category || '').toLowerCase() === 'packaging' || (i.category || '').toLowerCase() === 'kemasan');
        
        ingredientsList.forEach((ing, index) => {
            const ingName = (ing.name || '').toLowerCase();
            const ingCat = (ing.category || '').toLowerCase();
            const ingUnit = (ing.buyUnit || '').toLowerCase();
            
            let isPackaging = ingCat === 'packaging' || ingCat === 'kemasan';
            let rightSideHtml = '';

            if (isPackaging) {
                // Render Swap Packaging Dropdown
                let optionsHtml = '';
                packagingItems.forEach(p => {
                    const isSelected = p.id === ing.id ? 'selected' : '';
                    optionsHtml += `<option value="${p.id}" ${isSelected}>${p.name}</option>`;
                });
                // If original is not in packagingItems, add it as option
                if (!packagingItems.find(p => p.id === ing.id)) {
                    optionsHtml = `<option value="${ing.id}" selected>${ing.name}</option>` + optionsHtml;
                }
                
                rightSideHtml = `
                    <div style="display: flex; align-items: center; gap: 8px; width: 100%; max-width: 200px;">
                        <i class="ph ph-arrows-left-right" style="color: var(--text-muted);"></i>
                        <select class="form-control" id="upsize-swap-${index}" style="padding: 4px; font-size: 0.85em;">
                            ${optionsHtml}
                        </select>
                    </div>
                `;
            } else {
                // Render normal number input
                let defaultAddition = 0;
                const isIce = ingName.includes('ice') || ingName.includes('es ') || ingName.includes('es batu');

                if (
                    ingName.includes('sirup') || ingName.includes('syrup') || 
                    ingName.includes('powder') || ingName.includes('bubuk') || 
                    ingCat.includes('syrup') || ingCat.includes('powder') || 
                    ((ingUnit === 'gr' || ingUnit === 'gram') && !isIce)
                ) {
                    defaultAddition = 5;
                } else if (ingName.includes('espresso') || ingName.includes('shot') || ingName.includes('cream') || ingName.includes('krim')) {
                    defaultAddition = 10;
                } else if (
                    ingName.includes('susu') || ingName.includes('milk') || 
                    ingName.includes('kopi') || ingName.includes('coffee') || 
                    ingName.includes('air') || 
                    ingName.includes('water') || isIce || 
                    ingCat.includes('dairy') || ingCat.includes('coffee') || ingUnit === 'ml'
                ) {
                    defaultAddition = 50;
                }

                rightSideHtml = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 500;">+</span>
                        <input type="number" step="0.01" class="form-control" id="upsize-val-${index}" value="${defaultAddition}" style="width: 80px; text-align: center; padding: 4px;">
                        <span style="font-size: 0.85em; color: var(--text-secondary); width: 30px;">${ing.buyUnit || ''}</span>
                    </div>
                `;
            }

            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-main); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                    <div style="flex: 1; min-width: 0; margin-right: 8px;">
                        <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ing.name}</div>
                        <div style="font-size: 0.8em; color: var(--text-muted);">Asli: ${ing.usage} ${ing.buyUnit || ''}</div>
                    </div>
                    ${rightSideHtml}
                </div>
            `;
        });

        html += `
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
                        <button type="button" class="btn btn-secondary" onclick="window.app.modal.close()">Batal</button>
                        <button type="submit" class="btn btn-primary"><i class="ph ph-magic-wand"></i> Generate Upsize</button>
                    </div>
                </form>
            </div>
        `;

        window.app.modal.open(`Generate Upsize: ${recipe.name}`, html);
    },

    generateUpsize(event, recipeId) {
        event.preventDefault();
        const originalRecipe = this.data.find(r => r.id === recipeId);
        if (!originalRecipe) return;

        // Clone the recipe
        const newRecipe = JSON.parse(JSON.stringify(originalRecipe));
        newRecipe.id = window.app.storage.generateId('rec');
        newRecipe.name = newRecipe.name + ' (Upsize)';
        
        // Update ingredients
        const dbIngredients = window.app.storage.getIngredients();
        let newRawCogs = 0;

        if (newRecipe.ingredients) {
            newRecipe.ingredients.forEach((ing, index) => {
                const swapSelect = document.getElementById(`upsize-swap-${index}`);
                const addInput = document.getElementById(`upsize-val-${index}`);
                
                if (swapSelect) {
                    const newIngId = swapSelect.value;
                    if (newIngId && newIngId !== ing.id) {
                        const newIng = dbIngredients.find(i => i.id === newIngId);
                        if (newIng) {
                            ing.id = newIng.id;
                            ing.name = newIng.name;
                            ing.category = newIng.category;
                            ing.buyUnit = newIng.unit;
                            ing.buyPrice = newIng.buyPrice;
                            ing.buyQty = newIng.qty;
                        }
                    }
                } else if (addInput) {
                    const addition = parseFloat(addInput.value) || 0;
                    ing.usage = parseFloat(ing.usage) + addition;
                }

                // Look up latest price based on possibly swapped ID
                const latestIng = dbIngredients.find(i => i.id === ing.id);
                if (latestIng && latestIng.buyPrice > 0 && latestIng.qty > 0 && ing.usage > 0) {
                    ing.cost = (latestIng.buyPrice / latestIng.qty) * ing.usage;
                } else {
                    ing.cost = 0;
                }
                newRawCogs += ing.cost;
            });
        }

        newRecipe.rawCogs = newRawCogs;
        const bufferPct = newRecipe.bufferPct !== undefined ? newRecipe.bufferPct : 10;
        const bufferAmount = newRawCogs * (bufferPct / 100);
        newRecipe.totalCost = newRawCogs + bufferAmount;
        
        newRecipe.suggestedPrice = window.app.calculator.recommendedPrice(newRecipe.totalCost);
        
        // Upsize price logic: + Rp 5.000 from original normal price
        if (originalRecipe.finalPrice && originalRecipe.finalPrice > 0) {
            newRecipe.finalPrice = originalRecipe.finalPrice + 5000;
        } else {
            newRecipe.finalPrice = 0;
        }

        // Save
        this.data.push(newRecipe);
        window.app.storage.saveRecipes(this.data);
        
        window.app.modal.close();
        window.app.toast.show('Resep Upsize berhasil dibuat!');
        this.render();
        
        // Cascade to menu and dashboard
        if (window.app.menu) window.app.menu.render();
        if (window.app.dashboard) window.app.dashboard.render();
    },

    // --- Bulk Upsize Logic ---
    openBulkUpsizeModal() {
        if (!this.recipeTypes || this.recipeTypes.length === 0) {
            window.app.toast.show('Belum ada kategori yang dibuat.', 'error');
            return;
        }

        const allIngredients = window.app.storage.getIngredients();
        const packagingItems = allIngredients.filter(i => (i.category || '').toLowerCase() === 'packaging' || (i.category || '').toLowerCase() === 'kemasan');

        let catOptionsHtml = '';
        this.recipeTypes.forEach(t => {
            catOptionsHtml += `<option value="${t.name}">${t.name}</option>`;
        });

        let packOptionsHtml = '<option value="">-- Jangan Ganti Kemasan --</option>';
        packagingItems.forEach(p => {
            packOptionsHtml += `<option value="${p.id}">${p.name}</option>`;
        });

        const html = `
            <div style="margin-bottom: 16px;">
                <p style="color: var(--text-secondary); margin: 0 0 16px 0; font-size: 0.9em;">
                    Sistem akan menyapu bersih semua resep di kategori yang dipilih dan membuatkan versi Upsize-nya secara otomatis.
                </p>
                <form id="bulk-upsize-form" onsubmit="window.app.recipes.generateBulkUpsize(event)">
                    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
                        
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 4px; font-size: 0.9em;">1. Pilih Kategori Target</label>
                            <select class="form-control" id="bulk-target-category" required>
                                ${catOptionsHtml}
                            </select>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                            <div>
                                <label style="display: block; font-weight: 500; margin-bottom: 4px; font-size: 0.9em;">Tambah Cairan Dasar</label>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-weight: 500;">+</span>
                                    <input type="number" step="0.01" class="form-control" id="bulk-add-liquid" value="50" required title="Susu/Air/Es">
                                    <span style="font-size: 0.85em; color: var(--text-secondary);">ml</span>
                                </div>
                            </div>
                            <div>
                                <label style="display: block; font-weight: 500; margin-bottom: 4px; font-size: 0.9em;">Tambah Espresso / Krim</label>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-weight: 500;">+</span>
                                    <input type="number" step="0.01" class="form-control" id="bulk-add-espresso" value="10" required>
                                    <span style="font-size: 0.85em; color: var(--text-secondary);">ml</span>
                                </div>
                            </div>
                            <div>
                                <label style="display: block; font-weight: 500; margin-bottom: 4px; font-size: 0.9em;">Tambah Sirup</label>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-weight: 500;">+</span>
                                    <input type="number" step="0.01" class="form-control" id="bulk-add-syrup" value="5" required>
                                    <span style="font-size: 0.85em; color: var(--text-secondary);">ml/gr</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 4px; font-size: 0.9em;">2. Tambahan Harga Jual</label>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-weight: 500;">+ Rp</span>
                                <input type="number" class="form-control" id="bulk-add-price" value="5000" required>
                            </div>
                            <small style="color: var(--text-muted); display: block; margin-top: 4px;">Harga akhir resep akan ditambahkan nominal ini.</small>
                        </div>

                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 4px; font-size: 0.9em;">3. Ganti Kemasan Otomatis</label>
                            <div style="display: flex; align-items: center; gap: 8px; background: var(--bg-main); padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                                <select class="form-control" id="bulk-swap-from" style="flex: 1;">
                                    <option value="">-- Pilih Kemasan Asal --</option>
                                    ${packagingItems.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                                </select>
                                <i class="ph ph-arrow-right" style="color: var(--text-muted);"></i>
                                <select class="form-control" id="bulk-swap-to" style="flex: 1;">
                                    ${packOptionsHtml}
                                </select>
                            </div>
                        </div>

                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 8px;">
                        <button type="button" class="btn btn-secondary" onclick="window.app.modal.close()">Batal</button>
                        <button type="submit" class="btn btn-primary"><i class="ph ph-stack"></i> Generate Massal</button>
                    </div>
                </form>
            </div>
        `;
        window.app.modal.open('Bulk Upsize Generator', html);
    },

    generateBulkUpsize(event) {
        event.preventDefault();
        
        const targetCategory = document.getElementById('bulk-target-category').value;
        const addLiquid = parseFloat(document.getElementById('bulk-add-liquid').value) || 0;
        const addEspresso = parseFloat(document.getElementById('bulk-add-espresso').value) || 0;
        const addSyrup = parseFloat(document.getElementById('bulk-add-syrup').value) || 0;
        const addPrice = parseFloat(document.getElementById('bulk-add-price').value) || 0;
        
        const swapFromId = document.getElementById('bulk-swap-from').value;
        const swapToId = document.getElementById('bulk-swap-to').value;

        // Find applicable recipes
        const applicableRecipes = this.data.filter(r => 
            r.category === targetCategory && 
            !r.name.includes('(Upsize)')
        );

        if (applicableRecipes.length === 0) {
            window.app.toast.show('Tidak ada resep di kategori ini yang bisa di-upsize.', 'error');
            return;
        }

        const dbIngredients = window.app.storage.getIngredients();
        const newRecipes = [];
        let count = 0;

        applicableRecipes.forEach(originalRecipe => {
            const newRecipe = JSON.parse(JSON.stringify(originalRecipe));
            newRecipe.id = window.app.storage.generateId('rec');
            newRecipe.name = newRecipe.name + ' (Upsize)';
            
            let newRawCogs = 0;

            if (newRecipe.ingredients) {
                newRecipe.ingredients.forEach(ing => {
                    const ingName = (ing.name || '').toLowerCase();
                    const ingCat = (ing.category || '').toLowerCase();
                    const ingUnit = (ing.buyUnit || '').toLowerCase();

                    // Swap packaging check
                    if (swapFromId && swapToId && ing.id === swapFromId) {
                        const targetPackaging = dbIngredients.find(i => i.id === swapToId);
                        if (targetPackaging) {
                            ing.id = targetPackaging.id;
                            ing.name = targetPackaging.name;
                            ing.category = targetPackaging.category;
                            ing.buyUnit = targetPackaging.unit;
                            ing.buyPrice = targetPackaging.buyPrice;
                            ing.buyQty = targetPackaging.qty;
                        }
                    } else if (ingCat !== 'packaging' && ingCat !== 'kemasan') {
                        const isIce = ingName.includes('ice') || ingName.includes('es ') || ingName.includes('es batu');
                        // Apply additions
                        if (
                            ingName.includes('sirup') || ingName.includes('syrup') || 
                            ingName.includes('powder') || ingName.includes('bubuk') || 
                            ingCat.includes('syrup') || ingCat.includes('powder') || 
                            ((ingUnit === 'gr' || ingUnit === 'gram') && !isIce)
                        ) {
                            ing.usage += addSyrup;
                        } else if (ingName.includes('espresso') || ingName.includes('shot') || ingName.includes('cream') || ingName.includes('krim')) {
                            ing.usage += addEspresso;
                        } else if (
                            ingName.includes('susu') || ingName.includes('milk') || 
                            ingName.includes('kopi') || ingName.includes('coffee') || 
                            ingName.includes('air') || 
                            ingName.includes('water') || isIce || 
                            ingCat.includes('dairy') || ingCat.includes('coffee') || ingUnit === 'ml'
                        ) {
                            ing.usage += addLiquid;
                        }
                    }

                    // Recalculate cost
                    const latestIng = dbIngredients.find(i => i.id === ing.id);
                    if (latestIng && latestIng.buyPrice > 0 && latestIng.qty > 0 && ing.usage > 0) {
                        ing.cost = (latestIng.buyPrice / latestIng.qty) * ing.usage;
                    } else {
                        ing.cost = 0;
                    }
                    newRawCogs += ing.cost;
                });
            }

            newRecipe.rawCogs = newRawCogs;
            const bufferPct = newRecipe.bufferPct !== undefined ? newRecipe.bufferPct : 10;
            const bufferAmount = newRawCogs * (bufferPct / 100);
            newRecipe.totalCost = newRawCogs + bufferAmount;
            newRecipe.suggestedPrice = window.app.calculator.recommendedPrice(newRecipe.totalCost);
            
            if (originalRecipe.finalPrice && originalRecipe.finalPrice > 0) {
                newRecipe.finalPrice = originalRecipe.finalPrice + addPrice;
            } else {
                newRecipe.finalPrice = 0;
            }

            newRecipes.push(newRecipe);
            count++;
        });

        // Add to main array and save
        this.data.push(...newRecipes);
        window.app.storage.saveRecipes(this.data);
        
        window.app.modal.close();
        window.app.toast.show(`Berhasil membuat ${count} resep Upsize!`);
        this.render();
        
        // Cascade to menu and dashboard
        if (window.app.menu) window.app.menu.render();
        if (window.app.dashboard) window.app.dashboard.render();
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
                const descInput = document.getElementById('builder-recipe-description');
                if (descInput) descInput.value = recipe.description || '';
                // Deep copy ingredients and sort them alphabetically
                this.builderRows = JSON.parse(JSON.stringify(recipe.ingredients))
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                
                // Final Price
                const finalPriceInput = document.getElementById('builder-final-price');
                if(finalPriceInput) {
                    finalPriceInput.value = recipe.finalPrice ? window.app.formatter.number(recipe.finalPrice) : '';
                }
                
                const bufferInput = document.getElementById('builder-buffer-pct');
                if(bufferInput) {
                    bufferInput.value = recipe.bufferPct !== undefined ? recipe.bufferPct : 10;
                }
                // Category
                const catSelect = document.getElementById('builder-recipe-category');
                if (catSelect) {
                    let catHtml = '<option value="">-- No Category --</option>';
                    this.recipeTypes.forEach(t => catHtml += `<option value="${t.name}">${t.name}</option>`);
                    catSelect.innerHTML = catHtml;
                    catSelect.value = recipe.category || '';
                }
            }
        } else {
            nameInput.value = '';
            
            const catSelect = document.getElementById('builder-recipe-category');
            if (catSelect) {
                let catHtml = '<option value="">-- No Category --</option>';
                this.recipeTypes.forEach(t => catHtml += `<option value="${t.name}">${t.name}</option>`);
                catSelect.innerHTML = catHtml;
                nameInput.value = '';
                const descInput = document.getElementById('builder-recipe-description');
                if (descInput) descInput.value = '';
                catSelect.value = '';
            }

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

        const validIngredients = this.builderRows
            .filter(r => r.id && r.usage > 0)
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
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

        const catSelect = document.getElementById('builder-recipe-category');
        const category = catSelect ? catSelect.value : '';

        const descInput = document.getElementById('builder-recipe-description');
        const description = descInput ? descInput.value.trim() : '';

        const recipeToSave = {
            id: this.editId || window.app.storage.generateId('rec'),
            name,
            category,
            description,
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
