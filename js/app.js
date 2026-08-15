import { Store } from './store.js';
import { AW9 } from '../firebase-config.js';

async function loadApplicationSource(){
  const files=['app-code-1.txt','app-code-2.txt','app-code-3.txt'];
  const encoded=(await Promise.all(files.map(async name=>{
    const response=await fetch(new URL(name,import.meta.url),{cache:'no-store'});
    if(!response.ok) throw new Error(`No se pudo cargar ${name}`);
    return (await response.text()).trim();
  }))).join('');

  const binary=atob(encoded);
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);

  if(!('DecompressionStream' in window)){
    throw new Error('Este navegador necesita una versión más reciente para ejecutar AW9.');
  }
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

try{
  const source=await loadApplicationSource();
  new Function('Store','AW9',source)(Store,AW9);
  await import('./iva-ui.js');
}catch(error){
  console.error(error);
  document.body.innerHTML=`<main style="font-family:system-ui;padding:30px;max-width:700px;margin:auto"><h1>FACTUMADRID AW9</h1><p>No se pudo iniciar la aplicación.</p><pre style="white-space:pre-wrap">${String(error?.message||error)}</pre><button onclick="location.reload()">Reintentar</button></main>`;
}
