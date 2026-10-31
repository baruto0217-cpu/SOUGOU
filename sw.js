// Service Worker — 救急アセスメント総合支援
// キャッシュ名（バージョンを上げると古いキャッシュが削除される）
// 同じ公開先(baruto0217-cpu.github.io)のほかのアプリ(KUNREN等)の保存には触らない。emergency-suite- で始まるものだけ扱う
const CACHE_PREFIX = 'emergency-suite-';
const CACHE_NAME = CACHE_PREFIX + 'v37';

// キャッシュするファイル一覧
const CACHE_FILES = [
  './',
  './index.html',
  './pediatric.html',
  './obstetric.html',
  './burn.html',
  './ecg.html',
  './stroke.html',
  './abdominal.html',
  './seishinka.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
];

// インストール時：全ファイルをキャッシュに保存
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // ブラウザの一時保存(HTTPキャッシュ)を使わず、必ず最新を取得して保存する
      return Promise.all(CACHE_FILES.map(url =>
        fetch(new Request(url, { cache: 'reload' })).then(res => {
          if (!res.ok) throw new Error(url + ' ' + res.status);
          return cache.put(url, res);
        })
      ));
    })
  );
  // 古いService Workerを待たずに即座に有効化
  self.skipWaiting();
});

// アクティベート時：このアプリの古いキャッシュだけを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// フェッチ時：キャッシュ優先（Cache First）
self.addEventListener('fetch', event => {
  // ほかのサイトへの通信と、GET以外はそのまま通す
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => cache.match(event.request, { ignoreSearch: true })).then(cached => {
      if (cached) return cached;
      // キャッシュになければネットワークから取得してキャッシュに追加
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, toCache);
        });
        return response;
      }).catch(() => {
        // オフラインでキャッシュにもない場合はこのアプリのindex.htmlを返す
        return caches.open(CACHE_NAME).then(cache => cache.match('./index.html'));
      });
    })
  );
});
