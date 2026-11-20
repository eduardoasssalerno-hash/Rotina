// Service worker mínimo: permite instalar o app na tela inicial.
// Não guarda dados em cache para evitar telas desatualizadas.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
