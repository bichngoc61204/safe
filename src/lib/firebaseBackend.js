import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, signInAnonymously } from 'firebase/auth';
import { onSnapshot, collection, query, where, orderBy, limit, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { catalogRefs, observeCatalog, observeManagement, writeManagedCatalog } from './firebaseCatalog.js';
import { createTrafficTracker } from './trafficEvents.js';

export function connectFirebase(config) {
  const refs = catalogRefs(config);
  const auth = getAuth(refs.app);
  const traffic = createTrafficTracker({
    enabled: Boolean(import.meta.env?.PROD && config.measurementId), app: refs.app,
    loadSDK: () => import('firebase/analytics'),
    isPublic: () => window.location.pathname === '/', origin: window.location.origin,
  });
  return {
    observeCatalog: (receive, fail) => observeCatalog(refs.catalog, receive, fail),
    observeManagement:(receive,fail)=>observeManagement(refs.management,receive,fail),
    observeHistory:(receive,fail)=>onSnapshot(query(collection(refs.db,'catalogHistory'),orderBy('revision','desc'),limit(40)),snapshot=>receive(snapshot.docs.map(item=>({id:item.id,...item.data(),createdAt:item.data().createdAt?.toDate?.().toISOString()||''}))),fail),
    observeReports:(receive,fail)=>onSnapshot(query(collection(refs.db,'placeReports'),orderBy('createdAt','desc'),limit(100)),snapshot=>receive(snapshot.docs.map(item=>({id:item.id,...item.data(),createdAt:item.data().createdAt?.toDate?.().toISOString()||''}))),fail),
    observePendingReports:(receive,fail)=>onSnapshot(query(collection(refs.db,'placeReports'),where('status','==','new')),snapshot=>receive(snapshot.docs.map(item=>({id:item.id,...item.data(),createdAt:item.data().createdAt?.toDate?.().toISOString()||''}))),fail),
    async submitReport({placeId,placeName,reason,note}){
      if(!auth.currentUser)await signInAnonymously(auth);
      const uid=auth.currentUser.uid;
      const now=new Date();const day=`${now.getUTCFullYear()}-${now.getUTCMonth()+1}-${now.getUTCDate()}`;
      const ref=doc(refs.db,'placeReports',`${uid}_${day}_${placeId}`);
      if((await getDoc(ref)).exists())throw Error('reportDuplicate');
      return setDoc(ref,{placeId,placeName,reason,note:note.trim(),uid,day,status:'new',createdAt:serverTimestamp()});
    },
    resolveReport:(id,status,resolution='')=>updateDoc(doc(refs.db,'placeReports',id),{status,resolution,resolvedBy:auth.currentUser.uid,resolvedAt:serverTimestamp()}),
    observeEditor(receive) {
      let stopRole;
      const stopAuth = onAuthStateChanged(auth, user => {
        stopRole?.();
        if (!user || user.isAnonymous) {
          receive({ status: 'signedOut' });
          return;
        }
        receive({ status: 'checking' });
        stopRole = onSnapshot(refs.editor(user.uid), { includeMetadataChanges: true }, snapshot => {
          if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
          receive(snapshot.data()?.active === true
            ? { status: 'editor', email: user.email, uid:user.uid, role:snapshot.data()?.role==='superadmin'?'superadmin':'editor' }
            : { status: 'denied' });
        }, () => receive({ status: 'error' }));
      }, () => receive({ status: 'error' }));
      return () => { stopAuth(); stopRole?.(); };
    },
    observeEditors:(receive,fail)=>onSnapshot(collection(refs.db,'editors'),snapshot=>receive(snapshot.docs.map(item=>({uid:item.id,...item.data()}))),fail),
    createEditorAccount:async input=>(await import('./editorAccounts.js')).createEditorAccount(refs,auth,config,input),
    setEditorActive:async (uid,active)=>(await import('./editorAccounts.js')).setEditorActive(refs,auth,uid,active),
    loadEditorActivity:async options=>(await import('./editorStats.js')).loadEditorActivity({projectId:config.projectId,getIdToken:()=>auth.currentUser?.getIdToken(),...options}),
    getIdToken: () => auth.currentUser?.getIdToken(),
    enableTraffic: () => traffic.start(),
    trackTraffic: (event, placeId) => traffic.track(event, placeId),
    login: (email, password) => signInWithEmailAndPassword(auth, email, password),
    logout: () => signOut(auth),
    save: (data, revision) => writeManagedCatalog(refs,data,revision,auth.currentUser),
  };
}
