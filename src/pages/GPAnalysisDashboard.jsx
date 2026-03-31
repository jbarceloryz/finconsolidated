import React, { useEffect, useRef } from 'react'
import { IS_DEMO } from '../lib/DataCacheContext'

/** GP Analysis runs in an iframe. In dev, Vite serves it from the "GP Analysis" folder at /gp-analysis/. */
const GP_IFRAME_SRC = `/gp-analysis/index.html${IS_DEMO ? '?demo=true' : ''}`

export default function GPAnalysisDashboard() {
  const iframeRef = useRef(null)

  // When the shell is already unlocked, tell the iframe so it can show the dashboard without asking for password again.
  useEffect(() => {
    const isUnlocked = sessionStorage.getItem('finconsolidated-auth') === '1'
    if (!isUnlocked || !iframeRef.current) return
    const iframe = iframeRef.current
    const onLoad = () => {
      try {
        iframe.contentWindow?.postMessage(
          { type: 'finconsolidated-auth', unlocked: true },
          new URL(GP_IFRAME_SRC, window.location.origin).origin
        )
      } catch (_) {}
    }
    iframe.addEventListener('load', onLoad)
    if (iframe.contentWindow) onLoad()
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
