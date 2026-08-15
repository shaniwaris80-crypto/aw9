import {firebaseConfig,ARW} from '../../firebase-config.js';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAnalytics,isSupported as analyticsSupported} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js';
import {getAuth,setPersistence,browserLocalPersistence,browserSessionPersistence,signInWithEmailAndPassword,signOut,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {initializeFirestore,persistentLocalCache,persistentMultipleTabManager,collection,doc,getDocs,getDoc,setDoc,deleteDoc,writeBatch,runTransaction,serverTimestamp,waitForPendingWrites} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import {getStorage,ref as storageRef,uploadBytes,getDownloadURL,deleteObject} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js';
export const app=initializeApp(firebaseConfig);analyticsSupported().then(ok=>ok&&getAnalytics(app)).catch(()=>{});export const auth=getAuth(app);
export const db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});export const storage=getStorage(app);
const base=['companies',ARW.companyId];export const col=name=>collection(db,...base,name);export const ref=(name,id)=>doc(db,...base,name,id);export const settingsRef=()=>doc(db,...base,'settings','main');
const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
export const Auth={on:cb=>onAuthStateChanged(auth,cb),async email(email,password,remember=true){await setPersistence(auth,remember?browserLocalPersistence:browserSessionPersistence);return signInWithEmailAndPassword(auth,email,password)},async google(remember=true){await setPersistence(auth,remember?browserLocalPersistence:browserSessionPersistence);if(/iPhone|iPad|iPod/i.test(navigator.userAgent)){await signInWithRedirect(auth,provider);return null}return signInWithPopup(auth,provider)},redirect:()=>getRedirectResult(auth),logout:()=>signOut(auth)};
export async function readCollection(name){const s=await getDocs(col(name));return s.docs.map(d=>({id:d.id,...d.data()}))}
export const DB={getDoc,setDoc,deleteDoc,writeBatch,runTransaction,serverTimestamp,waitForPendingWrites};
export const Storage={async upload(path,file){const r=storageRef(storage,`companies/${ARW.companyId}/${path}`);const snap=await uploadBytes(r,file,{contentType:file.type||'application/octet-stream'});return {path:snap.ref.fullPath,url:await getDownloadURL(snap.ref),name:file.name||path,size:file.size||0,type:file.type||''}},async remove(fullPath){return deleteObject(storageRef(storage,fullPath))}};
