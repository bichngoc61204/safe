import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { catalogRefs, observeCatalog, writeCatalog } from './firebaseCatalog.js';

let trafficStarted = false;

export function connectFirebase(config) {
  const refs = catalogRefs(config);
  const auth = getAuth(refs.app);
  return {
    observeCatalog: (receive, fail) => observeCatalog(refs.catalog, receive, fail),
    observeEditor(receive) {
      let stopRole;
      const stopAuth = onAuthStateChanged(auth, user => {
        stopRole?.();
        if (!user) {
          receive({ status: 'signedOut' });
          return;
        }
        receive({ status: 'checking' });
        stopRole = onSnapshot(refs.editor(user.uid), { includeMetadataChanges: true }, snapshot => {
          if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
          receive(snapshot.data()?.active === true
            ? { status: 'editor', email: user.email }
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
    save: (data, revision) => writeCatalog(refs.catalog, data, revision),
  };
}
