import React, { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../../lib/supabase'

const PLACEHOLDER = `Situation:

Outlook:

Watch items / Risks: `

const DEBOUNCE_MS = 1200

/**
 * Editable finance-team commentary block for WBR / MBR reports.
 *
 * Persistence:
 *   - Primary store: Supabase `report_notes` table, keyed by (period_label, report_type).
 *     Schema: id, period_label text, report_type text, body text, updated_at timestamptz.
 *     Unique constraint on (period_label, report_type) so upsert is safe.
 *   - Fast-read cache: localStorage mirrors the last known value so the textarea
 *     populates instantly while the Supabase fetch is in flight, and works offline.
 *
 * Props:
 *   periodLabel  string  e.g. "Apr-26"
 *   reportType   string  "wbr" | "mbr"
 */
export default function CommentaryBlock({ periodLabel, reportType }) {
  const cacheKey = `ryz_report_note_${reportType}_${periodLabel}`

  const [text, setText] = useState(() => {
    try { return localStorage.getItem(cacheKey) || '' } catch { return '' }
  })
  const [status, setStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const [focused, setFocused] = useState(false)
  const debounceRef = useRef(null)
  const latestText = useRef(text)

  // ── Load from Supabase on mount / period change ──────────────────────────
  useEffect(() => {
    // Reset to cached value immediately so there's no flicker when switching periods
    const cached = (() => { try { return localStorage.getItem(cacheKey) || '' } catch { return '' } })()
    setText(cached)
    latestText.current = cached
    setStatus('idle')

    if (!isSupabaseConfigured()) return

    supabase
      .from('report_notes')
      .select('body')
      .eq('period_label', periodLabel)
      .eq('report_type', reportType)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { console.warn('CommentaryBlock fetch error:', error); return }
        const remote = data?.body ?? ''
        setText(remote)
        latestText.current = remote
        try { localStorage.setItem(cacheKey, remote) } catch { /* ignore */ }
      })
  }, [cacheKey, periodLabel, reportType])

  // ── Debounced Supabase upsert ────────────────────────────────────────────
  const saveToSupabase = useCallback((value) => {
    if (!isSupabaseConfigured()) return
    setStatus('saving')
    supabase
      .from('report_notes')
      .upsert(
        { period_label: periodLabel, report_type: reportType, body: value, updated_at: new Date().toISOString() },
        { onConflict: 'period_label,report_type' }
      )
      .then(({ error }) => {
        if (error) { console.error('CommentaryBlock save error:', error); setStatus('error') }
        else setStatus('saved')
      })
  }, [periodLabel, reportType])

  const handleChange = (e) => {
    const v = e.target.value
    setText(v)
    latestText.current = v
    try { localStorage.setItem(cacheKey, v) } catch { /* ignore */ }

    // Debounce the remote write
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setStatus('saving')
    debounceRef.current = setTimeout(() => { saveToSupabase(latestText.current) }, DEBOUNCE_MS)
  }

  // Flush on unmount in case the user closes the modal before the debounce fires
  useEffect(() => () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      saveToSupabase(latestText.current)
    }
  }, [saveToSupabase])

  const isEmpty = text.trim() === ''

  const statusLabel = !isSupabaseConfigured()
    ? 'local only'
    : status === 'saving' ? 'saving…'
    : status === 'saved' ? 'saved'
    : status === 'error' ? 'save error'
    : text.length > 0 ? `${text.length} chars`
    : 'not saved yet'

  const statusColor = status === 'error' ? 'text-rose-400' : status === 'saved' ? 'text-emerald-600' : 'text-slate-400'

  return (
    <>
      {/* ── Screen: editable textarea ───────────────────────── */}
      <div className="print:hidden mb-6">
        <div className="flex items-baseline justify-between mb-1.5">
          <h2 className="text-lg font-semibold text-slate-900">Finance Team Commentary</h2>
          <span className={`text-[10px] font-mono select-none ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
        <p className="text-[10.5px] text-slate-500 mb-2 leading-relaxed">
          Write a brief analyst narrative for this period — situation, outlook, and any watch items.
          Saved to Supabase and shared across all devices.
        </p>
        <textarea
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
