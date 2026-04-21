import React, { useEffect, useRef } from 'react'

/**
 * Shared modal wrapper for WBR and MBR reports.
 * - Light theme for a clean print look
 * - "Download PDF" triggers window.print() with a print-only stylesheet that hides everything except the report
 */
export default function ReportModal({ title, onClose, children, filename }) {
  const contentRef = useRef(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const handlePrint = () => {
    // Temporarily set the document title so the PDF filename matches
    const previousTitle = document.title
    if (filename) document.title = filename
    window.print()
    setTimeout(() => { document.title = previousTitle }, 500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto p-4 print:static print:bg-white print:p-0 print:block" role="dialog" aria-modal="true">
      <div className="w-full max-w-5xl my-6 print:m-0 print:max-w-none print:w-full">
        {/* Modal toolbar (hidden in print) */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-t-xl px-5 py-3 print:hidden">
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

        {/* Report content — this is what gets printed */}
        <div
          ref={contentRef}
          id="report-content"
          className="bg-white text-slate-900 rounded-b-xl print:rounded-none print:bg-white print:text-black"
        >
          {children}
        </div>
      </div>

      {/* Print-only stylesheet: hide everything outside the report */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-content, #report-content * { visibility: visible; }
          #report-content { position: absolute; left: 0; top: 0; width: 100%; }
          @page { size: A4; margin: 12mm 10mm; }
        }
      `}</style>
    </div>
  )
}
