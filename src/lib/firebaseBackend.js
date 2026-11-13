import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, signInAnonymously } from 'firebase/auth';
import { onSnapshot, collection, query, orderBy, limit, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { catalogRefs, observeCatalog, observeManagement, writeManagedCatalog } from './firebaseCatalog.js';

let trafficStarted = false;

export function connectFirebase(config) {
  const refs = catalogRefs(config);
  const auth = getAuth(refs.app);
  return {
    observeCatalog: (receive, fail) => observeCatalog(refs.catalog, receive, fail),
    observeManagement:(receive,fail)=>observeManagement(refs.management,receive,fail),
    observeHistory:(receive,fail)=>onSnapshot(query(collection(refs.db,'catalogHistory'),orderBy('revision','desc'),limit(40)),snapshot=>receive(snapshot.docs.map(item=>({id:item.id,...item.data(),createdAt:item.data().createdAt?.toDate?.().toISOString()||''}))),fail),
    observeReports:(receive,fail)=>onSnapshot(query(collection(refs.db,'placeReports'),orderBy('createdAt','desc'),limit(100)),snapshot=>receive(snapshot.docs.map(item=>({id:item.id,...item.data(),createdAt:item.data().createdAt?.toDate?.().toISOString()||''}))),fail),
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
            ? { status: 'editor', email: user.email, uid:user.uid }
            : { status: 'denied' });
        }, () => receive({ status: 'error' }));
      }, () => receive({ status: 'error' }));
      return () => { stopAuth(); stopRole?.(); };
    },
    getIdToken: () => auth.currentUser?.getIdToken(),
    async enableTraffic(isPublic) {
      if (!config.measurementId || trafficStarted) return;
      const { initializeAnalytics, isSupported, logEvent } = await import('firebase/analytics');
      if (!await isSupported() || !isPublic() || trafficStarted) return;
      const analytics = initializeAnalytics(refs.app, { config: { send_page_view: false } });
      trafficStarted = true;
      logEvent(analytics, 'page_view', { page_location: new URL('/', window.location.origin).href });
    },
    login: (email, password) => signInWithEmailAndPassword(auth, email, password),
    logout: () => signOut(auth),
    save: (data, revision) => writeManagedCatalog(refs,data,revision,auth.currentUser),
  };
}
