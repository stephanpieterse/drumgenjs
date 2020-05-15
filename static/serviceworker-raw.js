/* jshint strict: false, esversion:6*/
// configuration
const
    version = '1.0.5-$DATE',
    CACHE = version + '::PWAsite',
    offlineURL = '/static/page.html',
    installFilesEssential = [
        '/',
        '/static/manifest.json',
        '/static/jquery.js',
        '/static/hammer.min.js',
        '/static/page.js',
        '/static/page.css',
        '/static/android-chrome-512x512.png',
        '/static/loader.gif'
    ].concat(offlineURL),
    installFilesDesirable = [
        '/favicon.ico',
        '/static/buttons/tup1.png',
        '/static/buttons/tup2.png',
        '/static/buttons/tup3.png',
        '/static/buttons/tup4.png',
        '/static/buttons/tup5.png',
        '/static/buttons/ntype0.png',
        '/static/buttons/ntype1.png',
        '/static/buttons/ntype2.png',
        '/static/buttons/ntype3.png',
        '/static/buttons/ntype4.png',
        '/static/buttons/ntype5.png',
        '/static/buttons/ntype6.png',
        '/static/buttons/rests.png',
        '/static/buttons/star-filled.png',
        '/static/buttons/star-empty.png',
        '/static/settings.png'
    ];

function installStaticFiles() {

    return caches.open(CACHE)
        .then(cache => {

            // cache desirable files
            cache.addAll(installFilesDesirable);

            // cache essential files
            return cache.addAll(installFilesEssential);

        });
}

// application installation
self.addEventListener('install', event => {

    console.log('service worker: install');

    // cache core files
    event.waitUntil(
        installStaticFiles()
        .then(() => self.skipWaiting())
    );

});

// clear old caches
function clearOldCaches() {

    return caches.keys()
        .then(keylist => {

            return Promise.all(
                keylist
                .filter(key => key !== CACHE)
                .map(key => caches.delete(key))
            );

        });

}

// application activated
self.addEventListener('activate', event => {

    console.log('service worker: activate');

    // delete old caches
    event.waitUntil(
        clearOldCaches()
        .then(() => self.clients.claim())
    );

});


// application fetch network data
self.addEventListener('fetch', event => {

    // abandon non-GET requests
    if (event.request.method !== 'GET') return;
    return;

    let url = event.request.url;

    console.log("service worker : fetch : " + url);

    event.respondWith(

        caches.open(CACHE)
        .then(cache => {

            return cache.match(event.request)
                .then(response => {

                    if (response) {
                        // return cached file
                        console.log('cache fetch: ' + url);
                        return response;
                    }
                    // make network request
                    return fetch(event.request)
                        .then(newreq => {

                            console.log('network fetch: ' + url);
                            if (newreq.ok) {
                                cache.put(event.request, newreq.clone());
                            }
                            return newreq;

                        })
                        // app is offline
                        .catch(() => offlineAsset(url));

                });
        })
    );

});
