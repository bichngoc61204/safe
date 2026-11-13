import { initializeApp } from 'firebase/app';
import { doc, getFirestore, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { safeImage, validData } from './domain.js';
import { organizeCatalog } from './catalogGroups.js';
import { isClockTime } from './placeHours.js';
import { translatedPlaceFields } from './locale.js';
import { validSchedule, publicCatalog, catalogChanges, wasteTypes } from './editorial.js';

// Older Firestore records may still refer to retired bundled illustrations.
const validStoredImage = url => Boolean(safeImage(url)) ||
  (typeof url==='string' && /^\/demo-places\/[a-z]+\.(jpg|svg)$/i.test(url));

const optionalPlaceText = ['phone', 'owner', 'waste', 'hours', 'description', 'source', 'updatedAt'];

export function catalogRefs(config) {
  const app = initializeApp(config);
  const db = getFirestore(app);
  return { app, db, catalog: doc(db, 'catalogs', 'an-thuong'), management:doc(db,'management','an-thuong'), editor: uid => doc(db, 'editors', uid) };
}

export function validateCatalog(data) {
  try {
    if (!validData(data) || data.places.some(place =>
      (place.visibility!=null&&!['published','hidden'].includes(place.visibility))||
      (place.deletedAt!=null&&typeof place.deletedAt!=='string')||
      (place.schedule!=null&&!validSchedule(place.schedule))||
      (place.wasteTypes!=null&&(!Array.isArray(place.wasteTypes)||place.wasteTypes.some(type=>!wasteTypes.includes(type))))||
      (place.review!=null&&(!['pending','verified'].includes(place.review.status)||typeof(place.review.reviewedAt||'')!=='string'))||
      optionalPlaceText.some(key => place[key] != null && typeof place[key] !== 'string') ||
      Object.entries(translatedPlaceFields).some(([key,max]) => {
        const value=place[`${key}En`];
        return value!=null&&(typeof value!=='string'||value.length>max);
      }) ||
      ((place.opensAt || place.closesAt) && (!isClockTime(place.opensAt) || !isClockTime(place.closesAt) || place.opensAt===place.closesAt)) ||
      (place.image != null && place.image !== '' && !validStoredImage(place.image)) ||
      (place.images != null && (!Array.isArray(place.images) ||
        place.images.length > 5 || place.images.some(url => typeof url !== 'string' || !validStoredImage(url))))
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


export function observeManagement(ref,receive,fail){
 return onSnapshot(ref,{includeMetadataChanges:true},snapshot=>{
  if(snapshot.metadata.hasPendingWrites)return;
  if(!snapshot.exists()){if(!snapshot.metadata.fromCache)receive(null);return;}
  try{
   const {categories,places,revision,schemaVersion}=snapshot.data();
   const data={categories,places};validateCatalog(data);
   if(schemaVersion!==2||!Number.isSafeInteger(revision)||revision<1)throw Error();
   receive({data,revision,cached:snapshot.metadata.fromCache});
  }catch{fail(Error('catalogInvalid'));}
 },fail);
}

export async function writeManagedCatalog(refs,data,expectedRevision,actor){
 validateCatalog(data);data=organizeCatalog(data);
 return runTransaction(refs.db,async transaction=>{
  const [privateDoc,publicDoc]=await Promise.all([transaction.get(refs.management),transaction.get(refs.catalog)]);
  const previous=privateDoc.exists()?privateDoc:publicDoc;
  if(previous.data()?.revision!==expectedRevision)throw Error('catalogConflict');
  const before={categories:previous.data().categories,places:previous.data().places};
  data={...data,places:data.places.map(place=>place.review?.status==='verified'&&!place.review.reviewedAt?{...place,review:{...place.review,reviewedAt:new Date().toISOString(),reviewedBy:actor.uid}}:place)};
  const changes=catalogChanges(before,data);
  if(!changes.length)return;
  const revision=expectedRevision+1;
  transaction.set(refs.management,{...data,schemaVersion:2,revision,updatedAt:serverTimestamp()});
  transaction.set(refs.catalog,{...publicCatalog(data),schemaVersion:1,revision,updatedAt:serverTimestamp()});
  transaction.set(doc(refs.db,'catalogHistory',String(revision)),{revision,actor:actor.uid,actorEmail:actor.email||'',createdAt:serverTimestamp(),changes,snapshot:before});
 });
}
