import { initializeApp } from 'firebase/app';
import { doc, getFirestore, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { safeImage, validData } from './domain.js';
import { organizeCatalog } from './catalogGroups.js';

const optionalPlaceText = ['phone', 'owner', 'waste', 'hours', 'description', 'source', 'updatedAt'];

export function catalogRefs(config) {
  const app = initializeApp(config);
  const db = getFirestore(app);
  return { app, catalog: doc(db, 'catalogs', 'an-thuong'), editor: uid => doc(db, 'editors', uid) };
}

export function validateCatalog(data) {
  try {
    if (!validData(data) || data.places.some(place =>
      optionalPlaceText.some(key => place[key] != null && typeof place[key] !== 'string') ||
      (place.image != null && place.image !== '' && !safeImage(place.image)) ||
      (place.images != null && (!Array.isArray(place.images) ||
        place.images.length > 5 || place.images.some(url => typeof url !== 'string' || !safeImage(url))))
    )) throw new Error();
  } catch {
    throw new Error('catalogInvalid');
  }
  if (data.places.length > 200 || data.categories.length > 40 ||
      new TextEncoder().encode(JSON.stringify(data)).length > 800_000) {
    throw new Error('catalogLimit');
  }
}

export function observeCatalog(ref, receive, fail) {
  return onSnapshot(ref, { includeMetadataChanges: true }, snapshot => {
    if (snapshot.metadata.hasPendingWrites) return;
    if (!snapshot.exists()) {
      if (!snapshot.metadata.fromCache) receive(null);
      return;
    }
    try {
      const { categories, places, revision, schemaVersion } = snapshot.data();
      const data = { categories, places };
      validateCatalog(data);
      if (schemaVersion !== 1 || !Number.isSafeInteger(revision) || revision < 1) throw new Error();
      receive({ data: organizeCatalog(data), revision, cached: snapshot.metadata.fromCache });
    } catch {
      fail(new Error('catalogInvalid'));
    }
  }, fail);
}

// A null revision is reserved for the seed script. It only creates a missing catalog.
export async function writeCatalog(ref, data, expectedRevision) {
  validateCatalog(data);
  data = organizeCatalog(data);
  return runTransaction(ref.firestore, async transaction => {
    const snapshot = await transaction.get(ref);
    if (expectedRevision === null ? snapshot.exists() : snapshot.data()?.revision !== expectedRevision) {
      throw new Error(expectedRevision === null ? 'catalogExists' : 'catalogConflict');
    }
    transaction.set(ref, {
      categories: data.categories,
      places: data.places,
      schemaVersion: 1,
      revision: (expectedRevision ?? 0) + 1,
      updatedAt: serverTimestamp(),
    });
  });
}
