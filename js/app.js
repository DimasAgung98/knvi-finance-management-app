// app.js - Main Application Entry Point

const App = {
    init() {
        console.log("CoffeeShop Cost Management initialized");
        this.initTheme();
        this.initRouting();
        
        // Setup initial dummy data if storage is empty
        this.setupDummyData();
        
        // Initialize sub-modules if they exist
        if (window.app && window.app.dashboard) window.app.dashboard.init();
        if (window.app && window.app.ingredients) window.app.ingredients.init();
        if (window.app && window.app.recipes) window.app.recipes.init();
        if (window.app && window.app.menu) window.app.menu.init();
        if (window.app && window.app.pricing) window.app.pricing.init();
        if (window.app && window.app.opex) window.app.opex.init();
        if (window.app && window.app.expenses) window.app.expenses.init();
        if (window.app && window.app.daily) window.app.daily.init();
        if (window.app && window.app.bonus) window.app.bonus.init();
    },

    initTheme() {
        const themeBtn = document.getElementById('themeToggle');
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        
        themeBtn.addEventListener('click', () => {
            const theme = document.documentElement.getAttribute('data-theme');
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    },

    initRouting() {
        const navItems = document.querySelectorAll('.nav-item');
        const contentAreas = document.querySelectorAll('.content-area');
        const pageTitle = document.getElementById('topPageTitle');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Update active nav
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                // Update title
                pageTitle.textContent = item.textContent.trim();

                // Show target page
                const targetPage = item.getAttribute('data-page');
                if (!targetPage) return; // Prevent hiding content for toggle buttons

                contentAreas.forEach(area => {
                    area.classList.remove('active');
                });
                const targetArea = document.getElementById(`${targetPage}-page`);
                if(targetArea) {
                    targetArea.classList.add('active');
                }
                
                // Trigger page specific re-renders with fresh data
                if (targetPage === 'dashboard' && window.app && window.app.dashboard) {
                    window.app.dashboard.render();
                }
                if (targetPage === 'ingredients' && window.app && window.app.ingredients) {
                    window.app.ingredients.loadData();
                    window.app.ingredients.render();
                }
                if (targetPage === 'recipes' && window.app && window.app.recipes) {
                    window.app.recipes.loadData();
                    window.app.recipes.render();
                }
                if (targetPage === 'menu' && window.app && window.app.menu) {
                    window.app.menu.render();
                }
                if (targetPage === 'pricing' && window.app && window.app.pricing) {
                    window.app.pricing.render();
                }
                if (targetPage === 'opex' && window.app && window.app.opex) {
                    window.app.opex.loadData();
                    window.app.opex.render();
                }
                if (targetPage === 'expenses' && window.app && window.app.expenses) {
                    window.app.expenses.loadData();
                    window.app.expenses.render();
                }
                if (targetPage === 'daily' && window.app && window.app.daily) {
                    window.app.daily.loadData();
                    window.app.daily.render();
                }
                if (targetPage === 'bonus' && window.app && window.app.bonus) {
                    window.app.bonus.loadData();
                    window.app.bonus.render();
                }
            });
        });
    },
    
    setupDummyData() {
        // We will implement this in the storage utility, but call it here
    }
};

// Global namespace for modules to attach to
window.app = window.app || {};

window.app.reloadAllModules = () => {
    if (window.app.ingredients && window.app.ingredients.loadData) {
        window.app.ingredients.loadData();
        if (window.app.ingredients.populateFilter) window.app.ingredients.populateFilter();
    }
    if (window.app.recipes && window.app.recipes.loadData) window.app.recipes.loadData();
    if (window.app.opex && window.app.opex.loadData) window.app.opex.loadData();
    if (window.app.expenses && window.app.expenses.loadData) window.app.expenses.loadData();
    if (window.app.daily && window.app.daily.loadData) window.app.daily.loadData();
    if (window.app.bonus && window.app.bonus.loadData) window.app.bonus.loadData();

    // Re-render active tab
    const activeTab = document.querySelector('.content-area.active');
    if (activeTab) {
        const tabId = activeTab.id.replace('-page', '');
        if (tabId === 'dashboard' && window.app.dashboard) window.app.dashboard.render();
        else if (tabId === 'ingredients' && window.app.ingredients) window.app.ingredients.render();
        else if (tabId === 'recipes' && window.app.recipes) window.app.recipes.render();
        else if (tabId === 'menu' && window.app.menu) window.app.menu.render();
        else if (tabId === 'pricing' && window.app.pricing) window.app.pricing.render();
        else if (tabId === 'opex' && window.app.opex) window.app.opex.render();
        else if (tabId === 'expenses' && window.app.expenses) window.app.expenses.render();
        else if (tabId === 'daily' && window.app.daily) window.app.daily.render();
        else if (tabId === 'bonus' && window.app.bonus) window.app.bonus.render();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();

    // Check if Firebase Auth is already active on load
    if (window.app.firebase && window.app.firebase.auth && window.app.firebase.auth.currentUser) {
        if (window.app.storage && window.app.storage.initFirebaseSync) {
            window.app.storage.initFirebaseSync();
        }
    }

    // Listen for Firebase background sync
    window.addEventListener('firebase_sync_updated', () => {
        if (window.app.reloadAllModules) {
            window.app.reloadAllModules();
        }
    });

    // Register PWA Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(reg => {
            console.log('PWA Service Worker registered!', reg.scope);
        }).catch(err => {
            console.error('PWA Service Worker registration failed: ', err);
        });
    }
});
