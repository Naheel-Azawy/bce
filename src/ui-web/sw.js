const cacheName = "v1";

const cacheAssets = [
    "index.html",
    "index.bundle.js",
    "icon_96x96.png"
];

self.addEventListener("install", e => {
    console.log("Service Worker: Installed");
    e.waitUntil(
        caches.open(cacheName)
            .then(cache => {
                console.log("Service Worker: Caching Files");
                cache.addAll(cacheAssets);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", e => {
    console.log("Service Worker: Activated");
    e.waitUntil( // remove unwanted caches
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== cacheName) {
                        console.log("Service Worker: Clearing Old Cache");
                        return caches.delete(cache);
                    } else {
                        return undefined;
                    }
                })
            );
        })
    );
});

self.addEventListener("fetch", e => {
    console.log("Service Worker: Fetching");
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
