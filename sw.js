// Basic Service Worker to enable PWA installation
const CACHE_NAME = 'kanovi-cache-v1';

self.addEventListener('install', (event) => {
    // Skip waiting to activate immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Claim clients immediately
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // For now, bypass the cache and go straight to network
    // since Firebase is handling our offline data (Write-Through Cache).
    // The service worker merely exists to satisfy Android/iOS PWA requirements.
    event.respondWith(fetch(event.request));
});
