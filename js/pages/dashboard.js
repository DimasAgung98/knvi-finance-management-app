window.app = window.app || {};

window.app.dashboard = {
    sortConfig: { key: 'profit', direction: 'desc' },
    currentRecipeStats: [],
    chartInstance: null,

    init() {
        this.render();
    },

    render() {
        const ingredients = window.app.storage.getIngredients();
        const recipes = window.app.storage.getRecipes();

        const emptyState = document.getElementById('dashboard-empty-state');
        const mainView = document.getElementById('dashboard-main-view');

        if (recipes.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            if (mainView) mainView.style.display = 'none';
            return;
        } else {
            if (emptyState) emptyState.style.display = 'none';
            if (mainView) mainView.style.display = 'block';
        }

        // Calculate Core Metrics
        const totalIngredients = ingredients.length;
        const totalRecipes = recipes.length;
        
        let avgFoodCost = 0;
        let avgProfit = 0;
        let avgMargin = 0;
        let totalFc = 0;
        let totalProfit = 0;
        let totalMargin = 0;
        
        let validSpCount = 0;

        let maxPrice = 0;
        let minPrice = Infinity;
        let totalPrice = 0;
        let maxFc = 0;
        let minFc = Infinity;

        // Rankings Prep
        let recipeStats = [];

        recipes.forEach(r => {
            const sp = r.finalPrice > 0 ? r.finalPrice : r.suggestedPrice || 0;
            const cost = r.totalCost || 0;
            
            if(sp > 0) {
                const fc = (cost / sp) * 100;
                const profit = (sp - cost);
                const margin = (profit / sp) * 100;
                
                totalFc += fc;
                totalProfit += profit;
                totalMargin += margin;
                totalPrice += sp;
                
                if (sp > maxPrice) maxPrice = sp;
                if (sp < minPrice) minPrice = sp;
                if (fc > maxFc) maxFc = fc;
                if (fc < minFc) minFc = fc;

                validSpCount++;

                recipeStats.push({
                    name: r.name,
                    sp: sp,
                    cost: cost,
                    profit: profit,
                    margin: margin,
                    fc: fc
                });
            }
        });

        if (validSpCount > 0) {
            avgFoodCost = totalFc / validSpCount;
            avgProfit = totalProfit / validSpCount;
            avgMargin = totalMargin / validSpCount;
            totalPrice = totalPrice / validSpCount;
        }

        if (minPrice === Infinity) minPrice = 0;
        if (minFc === Infinity) minFc = 0;

        this.renderHealthCard(avgFoodCost, avgMargin, validSpCount);
        this.renderInsights(recipeStats, avgFoodCost, avgMargin);
        this.renderMetrics(totalIngredients, totalRecipes, avgFoodCost, avgProfit);
        this.renderRankings(recipeStats);
        this.renderStatsGrid(maxPrice, minPrice, totalPrice, avgMargin, maxFc, minFc);
        this.renderRecentActivity(recipes, ingredients);
        this.renderProfitTable(recipeStats);
    },

    renderHealthCard(avgFoodCost, avgMargin, validSpCount) {
        const card = document.getElementById('dashboard-health-card');
        if (!card) return;

        let score = 100;
        
        // Penalize for high food cost
        if (avgFoodCost > 35) score -= (avgFoodCost - 35) * 1.5;
        // Penalize for low margin
        if (avgMargin < 60) score -= (60 - avgMargin) * 1.2;
        // Bonus for having more recipes
        if (validSpCount > 10) score += 5;

        score = Math.max(0, Math.min(100, Math.round(score)));

        let status = 'Excellent';
        let color = 'var(--success-color)';
        let desc = 'Your menu pricing is healthy and profitable.';
        let icon = 'ph-check-circle';

        if (score < 60) {
            status = 'Critical';
            color = 'var(--danger-color)';
            desc = 'High risk. Re-evaluate your pricing or ingredient costs immediately.';
            icon = 'ph-warning-circle';
        } else if (score < 80) {
            status = 'Warning';
            color = 'var(--warning-color)';
            desc = 'Some items may need pricing adjustments to reach optimal margins.';
            icon = 'ph-warning';
        } else if (score < 90) {
            status = 'Good';
            color = 'var(--success-color)';
            desc = 'Solid performance, with room for minor optimization.';
            icon = 'ph-thumbs-up';
        }

        card.innerHTML = `
            <h3>Business Health</h3>
            <div class="health-score" style="color: ${color}">${score}</div>
            <div class="health-status" style="background: ${color}20; color: ${color};">
                <i class="ph ${icon}"></i> ${status}
            </div>
            <div class="health-desc">${desc}</div>
        `;
    },

    renderInsights(recipeStats, avgFoodCost, avgMargin) {
        const list = document.getElementById('dashboard-insights-list');
        if (!list) return;

        let insights = [];

        // Insight 1: General FC
        if (avgFoodCost <= 35) {
            insights.push(`<li><i class="ph ph-check-circle" style="color: var(--success-color);"></i> <div><strong>Great Job!</strong> Your average food cost is well below the 35% target.</div></li>`);
        } else {
            insights.push(`<li><i class="ph ph-warning" style="color: var(--warning-color);"></i> <div><strong>Attention needed.</strong> Your average food cost (${avgFoodCost.toFixed(1)}%) is above target.</div></li>`);
        }

        // Insight 2: High FC offenders
        const highFcItems = recipeStats.filter(r => r.fc > 40);
        if (highFcItems.length > 0) {
            insights.push(`<li><i class="ph ph-warning-circle" style="color: var(--danger-color);"></i> <div><strong>${highFcItems.length} menu items</strong> have a food cost over 40% (e.g. ${highFcItems[0].name}). Consider increasing prices.</div></li>`);
        } else {
            insights.push(`<li><i class="ph ph-check-circle" style="color: var(--success-color);"></i> <div>No menu items exceed 40% food cost.</div></li>`);
        }

        // Insight 3: Margin
        if (avgMargin >= 65) {
            insights.push(`<li><i class="ph ph-trend-up" style="color: var(--primary-color);"></i> <div>Average margin is excellent at ${avgMargin.toFixed(1)}%.</div></li>`);
        }

        list.innerHTML = insights.slice(0, 3).join('');
    },

    renderMetrics(totalIngredients, totalRecipes, avgFoodCost, avgProfit) {
        const grid = document.getElementById('dashboard-metrics');
        if (!grid) return;

        let fcStatusHTML = '';
        if (avgFoodCost <= 35) {
            fcStatusHTML = `<span class="badge badge-success" style="margin-top: 8px;">Target: <35% | On Track</span>`;
        } else if (avgFoodCost <= 40) {
            fcStatusHTML = `<span class="badge badge-warning" style="margin-top: 8px;">Target: <35% | Warning</span>`;
        } else {
            fcStatusHTML = `<span class="badge badge-danger" style="margin-top: 8px;">Target: <35% | Critical</span>`;
        }

        const opexData = window.app.storage.getOpex() || [];
        const activeOpex = opexData.filter(item => item.status !== 'Inactive');
        const totalOpex = activeOpex.reduce((sum, item) => sum + parseFloat(item.monthlyCost || 0), 0);
        
        let largestOpexName = '-';
        if (activeOpex.length > 0) {
            const largest = activeOpex.reduce((max, item) => item.monthlyCost > max.monthlyCost ? item : max, activeOpex[0]);
            largestOpexName = largest.name;
        }

        grid.innerHTML = `
            <div class="card metric-card">
                <span class="metric-title">Total Recipes</span>
                <span class="metric-value">${totalRecipes}</span>
            </div>
            <div class="card metric-card">
                <span class="metric-title">Avg Food Cost %</span>
                <span class="metric-value">${window.app.formatter.percent(avgFoodCost)}</span>
                ${fcStatusHTML}
            </div>
            <div class="card metric-card">
                <span class="metric-title">Total Monthly OPEX</span>
                <span class="metric-value" style="color: var(--danger-color);">${window.app.formatter.currency(totalOpex)}</span>
                <span style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">Top: ${largestOpexName}</span>
            </div>
            <div class="card metric-card">
                <span class="metric-title">Avg Est. Profit</span>
                <span class="metric-value">${window.app.formatter.currency(avgProfit)}</span>
            </div>
        `;
    },

    renderRankings(recipeStats) {
        const topList = document.getElementById('dashboard-top-products');
        const lowestList = document.getElementById('dashboard-lowest-products');
        if (!topList || !lowestList) return;

        const sortedByProfit = [...recipeStats].sort((a, b) => b.profit - a.profit);
        
        const renderItem = (item) => `
            <div class="ranking-item">
                <div class="ranking-info">
                    <span class="ranking-name">${item.name}</span>
                    <span class="ranking-details">FC: ${item.fc.toFixed(1)}% | Mar: ${item.margin.toFixed(1)}%</span>
                </div>
                <div class="ranking-value">${window.app.formatter.currency(item.profit)}</div>
            </div>
        `;

        const top5 = sortedByProfit.slice(0, 5);
        const lowest5 = [...sortedByProfit].reverse().slice(0, 5);

        topList.innerHTML = top5.length ? top5.map(renderItem).join('') : '<div style="padding: 12px; color: var(--text-secondary);">Not enough data</div>';
        lowestList.innerHTML = lowest5.length ? lowest5.map(renderItem).join('') : '<div style="padding: 12px; color: var(--text-secondary);">Not enough data</div>';
    },

    renderStatsGrid(maxPrice, minPrice, avgPrice, avgMargin, maxFc, minFc) {
        const statsList = document.getElementById('dashboard-quick-stats');
        if (!statsList) return;

        statsList.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Highest Selling Price</span>
                <span class="stat-val">${window.app.formatter.currency(maxPrice)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Lowest Selling Price</span>
                <span class="stat-val">${window.app.formatter.currency(minPrice)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Average Selling Price</span>
                <span class="stat-val">${window.app.formatter.currency(avgPrice)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Average Margin</span>
                <span class="stat-val">${avgMargin.toFixed(1)}%</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Highest Food Cost</span>
                <span class="stat-val" style="color: var(--danger-color);">${maxFc.toFixed(1)}%</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Lowest Food Cost</span>
                <span class="stat-val" style="color: var(--success-color);">${minFc.toFixed(1)}%</span>
            </div>
        `;
    },

    renderRecentActivity(recipes, ingredients) {
        const actList = document.getElementById('dashboard-recent-activity');
        if (!actList) return;

        // Mock recent activity based on last items since there are no timestamps
        let activities = [];
        
        if (recipes.length > 0) {
            const lastRecipe = recipes[recipes.length - 1];
            activities.push({
                title: `Recipe Created: ${lastRecipe.name}`,
                time: 'Recently',
                icon: 'ph-notebook',
                color: 'var(--primary-color)'
            });
        }
        if (recipes.length > 1) {
            const lastRecipe2 = recipes[recipes.length - 2];
            activities.push({
                title: `Price Changed: ${lastRecipe2.name}`,
                time: 'Recently',
                icon: 'ph-tag',
                color: 'var(--warning-color)'
            });
        }
        if (ingredients.length > 0) {
            const lastIng = ingredients[ingredients.length - 1];
            activities.push({
                title: `Ingredient Added: ${lastIng.name}`,
                time: 'Recently',
                icon: 'ph-bag',
                color: 'var(--success-color)'
            });
        }

        if (activities.length === 0) {
            actList.innerHTML = '<div style="padding: 12px; color: var(--text-secondary);">No recent activity</div>';
            return;
        }

        actList.innerHTML = activities.map(a => `
            <div class="activity-item">
                <div class="activity-icon" style="color: ${a.color}; background: ${a.color}20;">
                    <i class="ph ${a.icon}"></i>
                </div>
                <div class="activity-details">
                    <span class="activity-title">${a.title}</span>
                    <span class="activity-time">${a.time}</span>
                </div>
            </div>
        `).join('');
    },

    renderProfitTable(recipeStats = this.currentRecipeStats) {
        this.currentRecipeStats = recipeStats;
        const tbody = document.getElementById('dashboard-profit-table');
        if (!tbody) return;
        
        let sortedStats = [...recipeStats].sort((a, b) => {
            let valA = a[this.sortConfig.key];
            let valB = b[this.sortConfig.key];
            
            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }
            
            if (valA < valB) return this.sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return this.sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        let html = '';
        sortedStats.forEach(r => {
            const marginColor = r.margin >= 70 ? 'var(--success-color)' : (r.margin >= 65 ? 'var(--warning-color)' : 'var(--danger-color)');
            
            let status = 'Excellent';
            let badgeClass = 'badge-success';
            let rec = 'Healthy';
            let healthIcon = '<i class="ph ph-check-circle" style="color: var(--success-color); font-size: 1.2rem;"></i>';

            if (r.fc > 40) {
                status = 'Critical';
                badgeClass = 'badge-danger';
                rec = 'Increase Price or Reduce Cost';
                healthIcon = '<i class="ph ph-warning-circle" style="color: var(--danger-color); font-size: 1.2rem;"></i>';
            } else if (r.fc > 35) {
                status = 'Warning';
                badgeClass = 'badge-warning';
                rec = 'Review Margins';
                healthIcon = '<i class="ph ph-warning" style="color: var(--warning-color); font-size: 1.2rem;"></i>';
            } else if (r.fc > 30) {
                status = 'Good';
                badgeClass = 'badge-success';
                rec = 'Monitor';
            }
            
            html += `
                <tr>
                    <td style="font-weight: 600;">${r.name}</td>
                    <td style="text-align: right;">${window.app.formatter.currency(r.cost)}</td>
                    <td style="text-align: right;">${window.app.formatter.currency(r.sp)}</td>
                    <td style="text-align: right; color: ${r.profit > 0 ? 'var(--success-color)' : 'var(--danger-color)'}; font-weight: 600;">
                        ${window.app.formatter.currency(r.profit)}
                    </td>
                    <td style="text-align: right; color: ${marginColor}; font-weight: 600;">
                        ${r.margin.toFixed(1)}%
                    </td>
                    <td style="text-align: right; font-weight: 600;">
                        ${r.fc.toFixed(1)}%
                    </td>
                    <td style="text-align: center;">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                            ${healthIcon}
                            <span class="badge ${badgeClass}">${status}</span>
                        </div>
                    </td>
                    <td><span style="font-size: 0.85rem; color: var(--text-secondary);">${rec}</span></td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
        this.updateSortHeaders();
    },

    sortTable(key) {
        if (this.sortConfig.key === key) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortConfig.key = key;
            this.sortConfig.direction = 'asc';
        }
        this.renderProfitTable(this.currentRecipeStats);
    },

    updateSortHeaders() {
        const headers = document.querySelectorAll('#profit-table-head th.sortable');
        headers.forEach(th => {
            const key = th.getAttribute('data-sort');
            const icon = th.querySelector('i');
            if (key === this.sortConfig.key) {
                icon.className = this.sortConfig.direction === 'asc' ? 'ph ph-caret-up' : 'ph ph-caret-down';
                icon.style.opacity = '1';
                icon.style.color = 'var(--primary-color)';
            } else {
                icon.className = 'ph ph-caret-up-down';
                icon.style.opacity = '0.3';
                icon.style.color = 'inherit';
            }
        });
    }
};
