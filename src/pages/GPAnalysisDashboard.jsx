import React, { useEffect, useRef } from 'react'
import { IS_DEMO } from '../lib/DataCacheContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/** GP Analysis runs in an iframe. In dev, Vite serves it from the "GP Analysis" folder at /gp-analysis/. */
const GP_IFRAME_SRC = `/gp-analysis/index.html${IS_DEMO ? '?demo=true' : ''}`

export default function GPAnalysisDashboard() {
  const iframeRef = useRef(null)

  // Send the Supabase session token to the iframe so it can authenticate without a separate password.
  useEffect(() => {
    if (!iframeRef.current) return
    const iframe = iframeRef.current

    const sendSession = async () => {
      try {
        if (IS_DEMO) {
          // Demo mode — just tell iframe it's unlocked
          iframe.contentWindow?.postMessage(
            { type: 'finconsolidated-auth', unlocked: true },
            new URL(GP_IFRAME_SRC, window.location.origin).origin
          )
          return
        }
        if (!isSupabaseConfigured()) return
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          iframe.contentWindow?.postMessage(
            { type: 'finconsolidated-auth', unlocked: true, accessToken: session.access_token, refreshToken: session.refresh_token },
            new URL(GP_IFRAME_SRC, window.location.origin).origin
          )
        }
      } catch (_) {}
    }

    const onLoad = () => sendSession()
    iframe.addEventListener('load', onLoad)
    if (iframe.contentWindow) sendSession()
    return () => iframe.removeEventListener('load', onLoad)
  }, [])

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
