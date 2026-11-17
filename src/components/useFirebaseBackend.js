import { useEffect, useRef, useState } from 'react';
import { readFirebaseConfig } from '../lib/firebaseConfig.js';
import { publicCatalog } from '../lib/editorial.js';
import { newestCatalog } from '../lib/catalogSync.js';

const { config } = readFirebaseConfig(import.meta.env ?? {});

export function useFirebaseBackend() {
  const [backend, setBackend] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [catalogStatus, setCatalogStatus] = useState(config ? 'loading' : 'config');
  const [editor, setEditor] = useState({ status: config ? 'checking' : 'error' });
  const [management,setManagement]=useState(null);
  const [managementStatus,setManagementStatus]=useState('idle');
  const [attempt, setAttempt] = useState(0);
  const activeSession=useRef(null);
  activeSession.current={backend,editor};

  useEffect(() => {
    if (!config) return;
    let disposed = false;
    let stopCatalog;
    let stopEditor;
    import('../lib/firebaseBackend.js').then(({ connectFirebase }) => {
      if (disposed) return;
      const connection = connectFirebase(config);
      setBackend(connection);
      stopCatalog = connection.observeCatalog(next => {
        if(disposed)return;
        setCatalog(current=>newestCatalog(current,next));
        setCatalogStatus(next ? 'ready' : 'missing');
      }, () => setCatalogStatus('error'));
      stopEditor = connection.observeEditor(setEditor);
    }).catch(() => {
      if (disposed) return;
      setCatalogStatus('error');
      setEditor({ status: 'error' });
    });
    return () => { disposed = true; stopCatalog?.(); stopEditor?.(); };
  }, [attempt]);

  useEffect(()=>{
    if(editor.status!=='editor'||!backend?.observeManagement){setManagement(null);setManagementStatus('idle');return;}
    setManagementStatus('loading');
    let disposed=false;
    const stop=backend.observeManagement(next=>{
      if(disposed)return;
      setManagement(current=>newestCatalog(current,next));setManagementStatus(next?'ready':'legacy');
    },()=>{if(!disposed)setManagementStatus('rules');});
    return ()=>{disposed=true;stop?.();};
  },[backend,editor.status,attempt]);

  async function save(next,revision) {
    const connection=backend;
    const identity=editor.uid||editor.email;
    const saved=await connection.save(next,revision);
    const active=activeSession.current;
    // Only expose the server-confirmed result to the session that submitted it.
    if(active.backend!==connection||active.editor.status!=='editor'||(active.editor.uid||active.editor.email)!==identity)return saved;
    if(saved?.data&&Number.isSafeInteger(saved.revision)){
      const confirmed={data:saved.data,revision:saved.revision,cached:false};
      setManagement(current=>newestCatalog(current,confirmed));setManagementStatus('ready');
      setCatalog(current=>newestCatalog(current,{...confirmed,data:publicCatalog(saved.data)}));setCatalogStatus('ready');
    }
    return saved;
  }

  function retry() {
    setCatalogStatus('loading');
    setEditor({ status: 'checking' });
    setAttempt(value => value + 1);
  }

  return { backend, catalog, catalogStatus, editor, retry, management, managementStatus, save };
}
