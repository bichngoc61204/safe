import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import DuoGame from './DuoGame';
import './game.css';

const QuanGame = lazy(() => import('./QuanGame'));
const params = new URLSearchParams(location.search);
const showQuan = params.get('play') === 'quan' || params.has('room');
createRoot(document.getElementById('root')).render(showQuan
  ? <Suspense fallback={<main className="duo-shell" role="status">Đang mở bàn Ô Ăn Quan…</main>}><QuanGame/></Suspense>
  : <DuoGame/>);
