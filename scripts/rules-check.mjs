// Run only against a local Firestore Emulator, never a live Firebase project.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { makeTestCatalog } from './catalog.fixture.mjs';
import { writeManagedCatalog } from '../src/lib/firebaseCatalog.js';

const environment = await initializeTestEnvironment({
  projectId: 'demo-safemap',
  firestore: { host: '127.0.0.1', port: 8089, rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
});
let checks = 0;
const pass = async (name, action) => { await action(); checks++; process.stdout.write(`✓ ${name}\n`); };
const modular = context => context.firestore()._delegate || context.firestore();
const editor = modular(environment.authenticatedContext('editor-test', { email: 'editor@example.invalid' }));
const visitor = modular(environment.authenticatedContext('visitor-test'));
const stranger = modular(environment.authenticatedContext('stranger-test'));
const guest = modular(environment.unauthenticatedContext());
const refs = { db: editor, catalog: doc(editor, 'catalogs/an-thuong'), management: doc(editor, 'management/an-thuong') };
const initial = makeTestCatalog();
try {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async context => {
    const db = modular(context);
    await setDoc(doc(db, 'editors/editor-test'), { active: true });
    await setDoc(doc(db, 'catalogs/an-thuong'), { ...initial, schemaVersion: 1, revision: 1, updatedAt: serverTimestamp() });
  });
  await pass('Public catalog can be read without login', () => assertSucceeds(getDoc(doc(guest, 'catalogs/an-thuong'))));
  await pass('Private catalog, history and report list reject public reads', async () => {
    await assertFails(getDoc(doc(guest, 'management/an-thuong')));
    await assertFails(getDocs(collection(guest, 'catalogHistory')));
    await assertFails(getDocs(collection(visitor, 'placeReports')));
  });
  await pass('Visitors cannot modify public or private catalogs', async () => {
    await assertFails(updateDoc(doc(visitor, 'catalogs/an-thuong'), { revision: 2, updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(visitor, 'management/an-thuong'), { ...initial, schemaVersion: 2, revision: 2, updatedAt: serverTimestamp() }));
  });
  const changed = structuredClone(initial);
  changed.places[0].visibility = 'hidden';
  changed.places[1].deletedAt = '2026-11-13T00:00:00Z';
  changed.places[2].review = { status: 'verified' };
  await pass('First admin save atomically migrates private data and creates history', () => assertSucceeds(writeManagedCatalog(refs, changed, 1, { uid: 'editor-test', email: 'editor@example.invalid' })));
  await pass('Public projection hides trash and private review fields', async () => {
    const publicData = (await getDoc(doc(guest, 'catalogs/an-thuong'))).data();
    const privateData = (await getDoc(refs.management)).data();
    assert.equal(publicData.revision, 2);
    assert.equal(publicData.places.length, initial.places.length - 2);
    assert.equal(privateData.places.length, initial.places.length);
    assert.equal(publicData.places.find(point => point.id === initial.places[2].id).review, undefined);
    const history = (await getDoc(doc(editor, 'catalogHistory/2'))).data();
    assert.deepEqual(history.snapshot, initial);
    assert.equal(history.actor, 'editor-test');
  });
  await pass('History is immutable even for editors', async () => {
    await assertFails(updateDoc(doc(editor, 'catalogHistory/2'), { actorEmail: 'changed@example.invalid' }));
    await assertFails(deleteDoc(doc(editor, 'catalogHistory/2')));
  });
  await pass('Standalone public and private writes are rejected', async () => {
    await assertFails(updateDoc(refs.catalog, { revision: 3, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(refs.management, { revision: 3, updatedAt: serverTimestamp() }));
  });
  const next = structuredClone(changed);
  next.places[3].phone = '02363888888';
  await pass('Following transaction preserves private records and advances revision', () => assertSucceeds(writeManagedCatalog(refs, next, 2, { uid: 'editor-test', email: 'editor@example.invalid' })));
  await pass('Stale revision rejects concurrent overwrite', () => assert.rejects(writeManagedCatalog(refs, initial, 2, { uid: 'editor-test', email: 'editor@example.invalid' }), /catalogConflict/));
  const now = new Date();
  const day = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
  const reportId = `visitor-test_${day}_1`;
  const report = { placeId: '1', placeName: 'Điểm thử', uid: 'visitor-test', day, reason: 'wrongPhone', note: 'Số điện thoại cần kiểm tra', status: 'new', createdAt: serverTimestamp() };
  await pass('Signed-in visitor can create a bounded report under own daily ID', () => assertSucceeds(setDoc(doc(visitor, 'placeReports', reportId), report)));
  await pass('Other visitors cannot read or submit as another visitor', async () => {
    await assertFails(getDoc(doc(stranger, 'placeReports', reportId)));
    await assertFails(setDoc(doc(stranger, 'placeReports', reportId + '-new'), report));
  });
  await pass('Duplicate report and oversized notes are rejected', async () => {
    await assertFails(setDoc(doc(visitor, 'placeReports', reportId), report));
    await assertFails(setDoc(doc(visitor, 'placeReports', `visitor-test_${day}_2`), { ...report, placeId: '2', note: 'x'.repeat(501) }));
  });
  await pass('Editor can resolve report but cannot rewrite its content', async () => {
    await assertSucceeds(updateDoc(doc(editor, 'placeReports', reportId), { status: 'resolved', resolution: 'Đã kiểm tra', resolvedBy: 'editor-test', resolvedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(editor, 'placeReports', reportId), { note: 'rewritten' }));
  });
  process.stdout.write(`\n${checks} Firestore Rules checks passed on local emulator.\n`);
} finally {
  await environment.cleanup();
}
