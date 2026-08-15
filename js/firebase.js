import { firebaseConfig, ARW } from '../firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAnalytics, isSupported as analyticsSupported } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js';
import { getAuth, setPersistence, browserLocalPersistence, browserSessionPersistence, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, deleteDoc, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js';

export const app=initializeApp(firebaseConfig);
analyticsSupported().then(ok=>ok&&getAnalytics(app)).catch(()=>{});
export const auth=getAuth(app);
export const db=getFirestore(app);
export const storage=getStorage(app);
export const companyPath=['companies',ARW.companyId];
export const col=name=>collection(db,...companyPath,name);
export const ref=(name,id)=>doc(db,...companyPath,name,id);
const googleProvider=new GoogleAuthProvider();
googleProvider.setCustomParameters({prompt:'select_account'});
export const authApi={
  login:async(email,password,remember=true)=>{await setPersistence(auth,remember?browserLocalPersistence:browserSessionPersistence);return signInWithEmailAndPassword(auth,email,password)},
  loginGoogle:async(remember=true)=>{await setPersistence(auth,remember?browserLocalPersistence:browserSessionPersistence);return signInWithPopup(auth,googleProvider)},
  logout:()=>signOut(auth),
  onChange:onAuthStateChanged
};
export const storageApi={async upload(folder,id,file){const safe=String(file.name).replace(/[^a-zA-Z0-9._-]/g,'_');const path=`companies/${ARW.companyId}/${folder}/${id}/${Date.now()}_${safe}`;const r=storageRef(storage,path);const snap=await uploadBytes(r,file,{contentType:file.type});return {name:file.name,path,url:await getDownloadURL(snap.ref),type:file.type,size:file.size}}};
export {getDocs,getDoc,setDoc,deleteDoc,writeBatch,serverTimestamp};
