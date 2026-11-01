'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import './swagger-ui.css';

export default function ApiDocs({ nextApiSpec, supabaseSpec }) {
  const [source, setSource] = useState('next');
  const viewer = useRef(null);
  const spec = source === 'next' ? nextApiSpec : supabaseSpec;
  const sendSpec = useCallback((frame) => {
    frame.contentWindow?.postMessage({ type: 'floodwatch-api-spec', spec }, window.location.origin);
  }, [spec]);

  useEffect(() => {
    const onReady = (event) => {
      if (event.origin === window.location.origin && event.source === viewer.current?.contentWindow && event.data?.type === 'floodwatch-swagger-ready') {
        sendSpec(viewer.current);
      }
    };
    window.addEventListener('message', onReady);
    if (viewer.current?.contentDocument?.readyState === 'complete') sendSpec(viewer.current);
    return () => window.removeEventListener('message', onReady);
  }, [sendSpec]);

  return (
    <main className="floodwatch-docs">
      <header className="floodwatch-docs__header">
        <div className="floodwatch-docs__header-inner">
          <p className="floodwatch-docs__eyebrow">FloodWatch Cebu</p>
          <h1>API documentation</h1>
          <p>Browse existing API routes and the checked-in Supabase schema. Requests from this page are disabled.</p>
        </div>
      </header>
      <div className="floodwatch-docs__content">
        <nav className="floodwatch-docs__tabs" aria-label="API reference source">
          <button type="button" aria-pressed={source === 'next'} onClick={() => setSource('next')}>Next.js API routes</button>
          <button type="button" aria-pressed={source === 'supabase'} onClick={() => setSource('supabase')}>Supabase public schema</button>
        </nav>
        {source === 'supabase' && (
          <p className="floodwatch-docs__notice">
            This is the existing Swagger 2.0 snapshot in openapi.json. It describes Supabase PostgREST paths, not the Next.js routes. The snapshot does not specify authentication requirements and may differ from the current database. Available operations depend on current Supabase permissions and row-level security.
          </p>
        )}
        <iframe
          key={source}
          ref={viewer}
          title={`${source === 'next' ? 'Next.js API routes' : 'Supabase public schema'} Swagger reference`}
          src="/docs/viewer"
          className="floodwatch-docs__viewer"
          onLoad={(event) => sendSpec(event.currentTarget)}
        />
      </div>
    </main>
  );
}
