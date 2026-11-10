import { getApps, initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { doc, getFirestore, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { readFirebaseConfig } from '../lib/firebaseConfig';
import { encodeMove, playQuan, replayQuan } from './quan';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const validRoomCode = code => /^[A-HJ-NP-Z2-9]{8}$/.test(code);
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), byte => alphabet[byte % alphabet.length]).join('');
let connection;

async function connect() {
  const { config } = readFirebaseConfig(import.meta.env);
  if (!config) throw new Error('game-config');
  const app = getApps().find(item => item.name === 'dau-doi-game') ?? initializeApp(config, 'dau-doi-game');
  const auth = getAuth(app);
  await auth.authStateReady();
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
  return { uid:user.uid, db:getFirestore(app) };
}

function gameConnection() {
  connection ??= connect().catch(error => { connection = undefined; throw error; });
  return connection;
}
const roomRef = (db, code) => doc(db, 'gameQuanRooms', code);
const seatFor = (room, uid) => room.host === uid ? 0 : room.guest === uid ? 1 : -1;

export async function enterRoom(code) {
  if (code && !validRoomCode(code)) throw new Error('game-missing');
  const { db, uid } = await gameConnection();
  const create = !code;
  const id = code || newCode();
  const ref = roomRef(db, id);
  await runTransaction(db, async tx => {
    const snapshot = await tx.get(ref);
    if (create) {
      if (snapshot.exists()) throw new Error('game-collision');
      tx.set(ref, { host:uid, guest:null, createdAt:serverTimestamp(), moves:[] });
    } else {
      if (!snapshot.exists()) throw new Error('game-missing');
      const room = snapshot.data();
      if (seatFor(room, uid) !== -1) return;
      if (room.guest !== null) throw new Error('game-full');
      tx.update(ref, { guest:uid });
    }
  });
  return { id, uid, ref, db };
}

export function observeRoom(room, onChange, onError) {
  return onSnapshot(room.ref, {includeMetadataChanges:true}, snapshot => {
    if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) {
      onChange(null, false);
      return;
    }
    if (!snapshot.exists()) { onError(new Error('game-missing')); return; }
    const data = snapshot.data();
    onChange({ moves:data.moves, seat:seatFor(data, room.uid), paired:data.guest !== null }, true);
  }, onError);
}

export function sendMove(room, pit, direction, revision) {
  return runTransaction(room.db, async tx => {
    const snapshot = await tx.get(room.ref);
    if (!snapshot.exists()) throw new Error('game-missing');
    const data = snapshot.data();
    const current = replayQuan(data.moves);
    if (!current || !data.guest || data.moves.length !== revision || seatFor(data, room.uid) !== current.board.turn) {
      throw new Error('game-turn');
    }
    if (!playQuan(current.board, pit, direction)) throw new Error('game-turn');
    tx.update(room.ref, { moves:[...data.moves, encodeMove(pit, direction)] });
  });
}
