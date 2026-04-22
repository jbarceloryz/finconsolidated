import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * Shared modal wrapper for WBR and MBR reports.
 * - Rendered via a portal to document.body
 * - "Download PDF" clones the report HTML into an isolated iframe and prints that.
 *   This avoids any CSS conflicts / clipping from the parent app layout.
 */
export default function ReportModal({ title, onClose, children, filename }) {
  const contentRef = useRef(null)

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const handlePrint = () => {
    const content = contentRef.current
    if (!content) return

    // Collect parent stylesheets so the cloned report renders identically.
    // For cross-origin sheets we can't read cssRules — fall back to <link> tags.
    const styleFragments = []
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = sheet.cssRules
        if (rules) {
          styleFragments.push(Array.from(rules).map((r) => r.cssText).join('\n'))
        }
      } catch (_e) {
        if (sheet.href) {
          styleFragments.push(`@import url("${sheet.href}");`)
        }
      }
    }

    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.opacity = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument || iframe.contentWindow.document
    doc.open()
    doc.write(`<!doctype html><html data-theme="light"><head><meta charset="utf-8"><title>${(filename || title || 'Report').replace(/</g, '&lt;')}</title>
      <style>${styleFragments.join('\n')}</style>
      <style>
        html, body { margin: 0; padding: 0; background: #ffffff; color: #0f172a; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page-break-before { break-before: page; page-break-before: always; }
        @page { size: A4 landscape; margin: 10mm 8mm; }
        /* Ensure wide tables fit within the printable area */
        #report-root { width: 100%; }
        #report-root table {
          width: 100% !important;
          table-layout: auto !important;
          font-size: 8.5px !important;
          border-collapse: collapse !important;
        }
        #report-root table th,
        #report-root table td {
          padding: 3px 4px !important;
          white-space: nowrap;
          word-break: keep-all;
        }
        /* First column (entity / line item labels) can wrap when needed */
        #report-root table th:first-child,
        #report-root table td:first-child {
          white-space: normal;
          word-break: break-word;
        }
        #report-root .overflow-x-auto { overflow: visible !important; }
      </style>
    </head><body><div id="report-root">${content.innerHTML}</div></body></html>`)
    doc.close()

    const cleanup = () => {
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
      }, 300)
    }

    const triggerPrint = () => {
      try {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
      } catch (err) {
        console.warn('Print failed:', err)
      }
      cleanup()
    }

    // Give the iframe a tick to lay out before printing
    if (iframe.contentDocument.readyState === 'complete') {
      setTimeout(triggerPrint, 100)
    } else {
      iframe.onload = () => setTimeout(triggerPrint, 100)
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-5xl my-6">
        {/* Modal toolbar */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-t-xl px-5 py-3">
          <div>
            <h2 className="font-semibold text-white text-lg">{title}</h2>
            <p className="text-slate-400 text-xs">Preview below — click Download PDF to save</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>
              </svg>
              Download PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm font-medium text-slate-200"
            >
              Close
            </button>
          </div>
        </div>

        {/* Report content — this is what gets cloned to the print iframe.
            Scoped to data-theme="light" so the Tailwind→Ledger remap resolves to
            dark text on white regardless of the app's current theme. */}
        <div
          ref={contentRef}
          id="report-content"
          data-theme="light"
          className="bg-white text-slate-900 rounded-b-xl"
        >
          {children}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
