import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

export async function requireSuperAdmin(refs, auth) {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw Error('accountDenied');
  const role = (await getDoc(refs.editor(user.uid))).data();
  if (role?.active !== true || role.role !== 'superadmin') throw Error('accountDenied');
  return user;
}

// A separate, memory-only Auth instance preserves the administrator's session.
export async function createEditorAccount(refs, auth, config, { email, password, displayName }) {
  const actor = await requireSuperAdmin(refs, auth);
  email = email?.trim().toLowerCase(); displayName = displayName?.trim() || '';
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || displayName.length > 80 || typeof password !== 'string' || password.length < 6) throw Error('accountInvalid');
  const app = initializeApp(config, `create-editor-${crypto.randomUUID()}`);
  const secondary = initializeAuth(app, { persistence: inMemoryPersistence });
  try {
    let credential;
    try { credential = await createUserWithEmailAndPassword(secondary, email, password); }
    catch (error) {
      if (error.code !== 'auth/email-already-in-use') throw error;
      // Retry an interrupted grant, or link an existing account whose password
      // the administrator supplies. Never reset or take over an unknown account.
      credential = await signInWithEmailAndPassword(secondary, email, password);
    }
    const ref = doc(refs.db, 'editors', credential.user.uid);
    const existing = await getDoc(ref);
    if (existing.exists()) throw Error('accountExists');
    try {
      await setDoc(ref, { email, displayName, role: 'editor', active: true,
        createdBy: actor.uid, createdAt: serverTimestamp(), updatedBy: actor.uid, updatedAt: serverTimestamp() });
    } catch { throw Error('accountGrantFailed'); }
    return credential.user.uid;
  } finally { await signOut(secondary).catch(() => {}); await deleteApp(app); }
}

export async function setEditorActive(refs, auth, uid, active) {
  const actor = await requireSuperAdmin(refs, auth);
  if (uid === actor.uid || typeof active !== 'boolean') throw Error('accountDenied');
  return updateDoc(doc(refs.db, 'editors', uid), { active, updatedBy: actor.uid, updatedAt: serverTimestamp() });
}
