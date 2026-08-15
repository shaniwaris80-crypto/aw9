const CACHE='arw2026-v4-20260815-2202';
const CORE=['./','./index.html','./styles.css','./firebase-config.js','./js/data.js','./js/domain.js','./js/firebase.js','./js/pdf.js','./js/app.js'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;

  let url;
  try{url=new URL(request.url);}catch{return;}
  if(url.protocol!=='http:'&&url.protocol!=='https:')return;

  // Solo gestionamos y cacheamos recursos del propio ARW2026.
  // Recursos de extensiones del navegador o CDNs pasan directamente por red.
  if(url.origin!==self.location.origin)return;

  event.respondWith(
    fetch(request)
      .then(response=>{
        if(response&&response.ok&&response.type==='basic'){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
        }
        return response;
      })
      .catch(async()=>{
        const cached=await caches.match(request);
        if(cached)return cached;
        if(request.mode==='navigate')return caches.match('./index.html');
        throw new Error('RECURSO NO DISPONIBLE SIN CONEXIÓN');
      })
  );
});
