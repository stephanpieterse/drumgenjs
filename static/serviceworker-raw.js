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
    '/static/page.css',
    '/static/android-chrome-512x512.png',
    '/static/loader.gif'
  ].concat(offlineURL),
  installFilesDesirable = [
    '/favicon.ico',
    '/static/about.png',
    '/static/settings.png'
  ];

const PATTERN_HEADER_NAME = "x-drumgen-patref";
let last_pattern = "";
// install static assets
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

function formatHeaders(headersObject) {
    var headers = [];
    for (var pair of headersObject.entries()) {
        headers.push({
            name: pair[0],
            value: pair[1]
        });
    }

    return headers;
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

            if (url.indexOf('refresh') !== -1){
                console.log("Found a refresh request, should add a new header");
                
                var reqUrl = url + "&patref=" + last_pattern;
                console.log("set requrl ::" + reqUrl);
                try {
                var refreshRequest = new Request(reqUrl, {
                  headers: {
                    PATTERN_HEADER_NAME: last_pattern
                  }
                });
                // console.log(refreshRequest);
                return fetch(refreshRequest);
              } catch(e){
                console.log("whut :: " + e);
              }
            }

            // make network request
            return fetch(event.request)
              .then(newreq => {

                console.log('network fetch: ' + url);
                if (newreq.ok) cache.put(event.request, newreq.clone());
                if (newreq.headers){
                  let allHeaders = formatHeaders(newreq.headers);
                  for (let ah in allHeaders){
                    if(allHeaders[ah].name == PATTERN_HEADER_NAME){
                      last_pattern = allHeaders[ah].value;
                      console.log("MOST RECEENT PATTNERN WAS  " + last_pattern);
                    }
                  }
                  console.log(allHeaders);
                }
                return newreq;

              })
              // app is offline
              .catch(() => offlineAsset(url));

          });

      })

  );

});

