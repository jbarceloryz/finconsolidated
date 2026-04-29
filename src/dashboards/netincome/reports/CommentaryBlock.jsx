import React, { useEffect, useRef, useState } from 'react'

const PLACEHOLDER = `Situation:

Outlook:

Watch items / Risks: `

/**
 * Editable finance-team commentary block for WBR / MBR reports.
 *
 * - Persists text to localStorage keyed by period + report type so drafts
 *   survive page refreshes and are ready the next time the same period is opened.
 * - In screen preview: shows an editable textarea with a subtle edit affordance.
 * - In print (PDF): renders as a clean, visually distinct analyst-note block.
 *
 * Props:
 *   periodLabel  string  e.g. "Apr-26"
 *   reportType   string  "wbr" | "mbr"
 */
export default function CommentaryBlock({ periodLabel, reportType }) {
  const storageKey = `ryz_report_note_${reportType}_${periodLabel}`
  const [text, setText] = useState(() => {
    try { return localStorage.getItem(storageKey) || '' } catch { return '' }
  })
  const [focused, setFocused] = useState(false)
  const taRef = useRef(null)

  // Re-load if a different period is opened in the same session
  useEffect(() => {
    try { setText(localStorage.getItem(storageKey) || '') } catch { /* ignore */ }
  }, [storageKey])

  const handleChange = (e) => {
    const v = e.target.value
    setText(v)
    try { localStorage.setItem(storageKey, v) } catch { /* ignore */ }
  }

  const isEmpty = text.trim() === ''

  return (
    <>
      {/* ── Screen: editable textarea ───────────────────────── */}
      <div className="print:hidden mb-6">
        <div className="flex items-baseline justify-between mb-1.5">
          <h2 className="text-lg font-semibold text-slate-900">Finance Team Commentary</h2>
          <span className="text-[10px] text-slate-400 font-mono select-none">
            {text.length > 0 ? `${text.length} chars · auto-saved` : 'not saved yet'}
          </span>
        </div>
        <p className="text-[10.5px] text-slate-500 mb-2 leading-relaxed">
          Write a brief analyst narrative for this period — situation, outlook, and any watch items.
          This text is saved locally in your browser and will reappear the next time you open this report.
        </p>
        <textarea
          ref={taRef}
          value={text}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={PLACEHOLDER}
          rows={7}
          className={`w-full resize-none rounded-lg border text-[11.5px] leading-relaxed font-sans px-3 py-2.5 text-slate-800 bg-white transition-colors outline-none ${
            focused
              ? 'border-emerald-500 ring-1 ring-emerald-500/30'
              : 'border-slate-300 hover:border-slate-400'
          }`}
          style={{ fontFamily: 'inherit' }}
        />
        {isEmpty && (
          <p className="text-[10px] text-slate-400 mt-1">
            Tip: structure your notes as <em>Situation</em>, <em>Outlook</em>, and <em>Watch items</em>.
          </p>
        )}
      </div>

      {/* ── Print: rendered prose block ─────────────────────── */}
      <div className="hidden print:block mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Finance Team Commentary</h2>
        {isEmpty ? (
          <p className="text-slate-400 italic text-[11px]">No commentary added for this period.</p>
        ) : (
          <div
            className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-slate-800"
            style={{ borderLeft: '3px solid #10b981' }}
          >
            {text.split('\n').map((line, i) => {
              const isHeader = /^(Situation|Outlook|Watch items|Risks|Actions|Next steps)\s*:/i.test(line)
              if (line.trim() === '') return <div key={i} style={{ height: '0.5em' }} />
              return (
                <p key={i} className={`text-[11.5px] leading-relaxed ${isHeader ? 'font-semibold text-slate-900 mt-2' : 'text-slate-700'}`}>
                  {line}
                </p>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
