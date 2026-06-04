import React, { useEffect, useRef } from 'react'
import { IS_DEMO } from '../lib/DataCacheContext'
import { useAuth } from '../lib/AuthContext'

/** GP Analysis runs in an iframe. In dev, Vite serves it from the "GP Analysis" folder at /gp-analysis/. */
const GP_IFRAME_SRC = `/gp-analysis/index.html${IS_DEMO ? '?demo=true' : ''}`

export default function GPAnalysisDashboard() {
  const iframeRef = useRef(null)
  const { session } = useAuth()

  // This page only renders when the shell is authorized. Forward the Supabase
  // session into the iframe so its own client can read data under RLS, and tell
  // it to drop its auth gate. Re-posts on token refresh while mounted.
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const origin = new URL(GP_IFRAME_SRC, window.location.origin).origin
    const post = () => {
      try {
        iframe.contentWindow?.postMessage(
          {
            type: 'finconsolidated-auth',
            unlocked: true,
            session: session
              ? { access_token: session.access_token, refresh_token: session.refresh_token }
              : null,
          },
          origin
        )
      } catch (_) {}
    }
    iframe.addEventListener('load', post)
    if (iframe.contentWindow) post()
    return () => iframe.removeEventListener('load', post)
  }, [session])

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-0px)]">
      <iframe
        ref={iframeRef}
        src={GP_IFRAME_SRC}
        title="GP Analysis — Talent Pool Net Margin"
        className="flex-1 w-full border-0 min-h-[600px] bg-slate-950"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}
