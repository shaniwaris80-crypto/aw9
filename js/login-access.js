import {Store} from './store.js';

const $=s=>document.querySelector(s);
const status=msg=>{const el=$('#loginStatus');if(el)el.textContent=msg||''};
const friendly=err=>{
  const code=err?.code||'';
  const map={
    'auth/invalid-credential':'EMAIL O CONTRASEÑA INCORRECTOS',
    'auth/wrong-password':'CONTRASEÑA INCORRECTA',
    'auth/user-not-found':'USUARIO NO CREADO EN FIREBASE AUTHENTICATION',
    'auth/operation-not-allowed':'ESTE MÉTODO DE ACCESO NO ESTÁ ACTIVADO EN FIREBASE',
    'auth/unauthorized-domain':'FALTA AUTORIZAR shaniwaris80-crypto.github.io EN FIREBASE AUTHENTICATION',
    'auth/popup-closed-by-user':'SE CERRÓ LA VENTANA DE GOOGLE',
    'auth/network-request-failed':'ERROR DE RED AL CONECTAR CON FIREBASE'
  };
  return map[code]||`${code||'ERROR'} · ${err?.message||''}`;
};

function init(){
  const g=$('#googleLoginBtn');
  if(g)g.onclick=async()=>{
    status('ABRIENDO GOOGLE...');
    try{
      const r=await Store.loginGoogle($('#rememberSession')?.checked!==false);
      const email=String(r?.user?.email||'').toLowerCase();
      if(email!=='shaniwaris80@gmail.com'){
        await Store.logout();
        status('USA LA CUENTA shaniwaris80@gmail.com');
        return;
      }
      status('ACCESO CORRECTO');
    }catch(err){console.error(err);status(friendly(err));}
  };
  Store.subscribe((_state,meta)=>{
    if(meta.user){
      if(meta.online)status('CONECTADO A FIREBASE ✓');
      else if(meta.lastError)status(`SESIÓN INICIADA · FIRESTORE: ${meta.lastError}`);
      else status('SESIÓN INICIADA');
    }
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
