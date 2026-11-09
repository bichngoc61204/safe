import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { catalogRefs, observeCatalog, writeCatalog } from './firebaseCatalog.js';

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
    login: (email, password) => signInWithEmailAndPassword(auth, email, password),
    logout: () => signOut(auth),
    save: (data, revision) => writeCatalog(refs.catalog, data, revision),
  };
}
