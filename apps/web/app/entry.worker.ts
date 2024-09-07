/// <reference lib="WebWorker" />

export {};

declare let self: ServiceWorkerGlobalScope;

self.addEventListener('install', (event) => {
  console.info('Service worker installed');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.info('Service worker activated');
  event.waitUntil(self.clients.claim());
});
