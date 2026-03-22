/* Minimal offline shell: cache static assets after install */
const CACHE = 'cbt-shell-v1';

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE).then((cache) =>
			cache.addAll(['/', '/favicon.png']).catch(() => undefined)
		)
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	event.respondWith(
		fetch(request)
			.then((response) => {
				const copy = response.clone();
				caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
				return response;
			})
			.catch(() => caches.match(request))
	);
});
