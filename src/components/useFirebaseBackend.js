import { useEffect, useState } from 'react';
import { readFirebaseConfig } from '../lib/firebaseConfig.js';

const { config } = readFirebaseConfig(import.meta.env ?? {});

export function useFirebaseBackend() {
  const [backend, setBackend] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [catalogStatus, setCatalogStatus] = useState(config ? 'loading' : 'config');
  const [editor, setEditor] = useState({ status: config ? 'checking' : 'error' });
  const [management,setManagement]=useState(null);
  const [managementStatus,setManagementStatus]=useState('idle');
  const [attempt, setAttempt] = useState(0);

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
        setCatalog(next);
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
    return backend.observeManagement(next=>{setManagement(next);setManagementStatus(next?'ready':'legacy');},()=>setManagementStatus('rules'));
  },[backend,editor.status,attempt]);

  function retry() {
    setCatalogStatus('loading');
    setEditor({ status: 'checking' });
    setAttempt(value => value + 1);
  }

  return { backend, catalog, catalogStatus, editor, retry, management, managementStatus };
}
