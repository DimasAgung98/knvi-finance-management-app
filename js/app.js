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
        if (window.app && window.app.daily) window.app.daily.init();
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
                
                // Trigger page specific re-renders
                if (targetPage === 'dashboard' && window.app && window.app.dashboard) {
                    window.app.dashboard.render();
                }
                if (targetPage === 'menu' && window.app && window.app.menu) {
                    window.app.menu.render();
                }
                if (targetPage === 'pricing' && window.app && window.app.pricing) {
                    window.app.pricing.render();
                }
                if (targetPage === 'opex' && window.app && window.app.opex) {
                    window.app.opex.render();
                }
                if (targetPage === 'daily' && window.app && window.app.daily) {
                    window.app.daily.render();
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

document.addEventListener('DOMContentLoaded', () => {
    App.init();

    // Listen for Firebase background sync
    window.addEventListener('firebase_sync_updated', () => {
        const activeTab = document.querySelector('.content-area.active');
        if (!activeTab) return;
        
        const tabId = activeTab.id.replace('-page', '');
        if (tabId === 'recipes' && window.app.recipes) window.app.recipes.render();
        if (tabId === 'pricing' && window.app.pricing) window.app.pricing.render();
        if (tabId === 'dashboard' && window.app.dashboard) window.app.dashboard.render();
        if (tabId === 'opex' && window.app.opex) window.app.opex.render();
        if (tabId === 'daily' && window.app.daily) window.app.daily.render();
        if (tabId === 'ingredients' && window.app.ingredients) window.app.ingredients.render();
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
