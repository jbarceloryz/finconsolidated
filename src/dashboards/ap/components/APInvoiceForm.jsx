import React, { useState, useEffect } from 'react'

const COMPANIES = ['HC', 'Offsiteio', 'Hiptrain', 'LLC', 'Ntrvsta']
const CATEGORIES = ['Software', 'Contractor', 'Rent', 'Utilities', 'Insurance', 'Marketing', 'Travel', 'Office Supplies', 'Legal', 'Payroll', 'Other']
const STATUSES = ['PENDING', 'APPROVED', 'PAID', 'OVERDUE', 'VOID']
const PAYMENT_METHODS = ['ACH', 'Wire', 'Check', 'Credit Card', 'Other']

function formatDateForInput(date) {
  if (!date) return ''
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function APInvoiceForm({ invoice, onSave, onClose }) {
  const isEdit = !!invoice

  const [company, setCompany] = useState(invoice?.company || 'HC')
  const [vendor, setVendor] = useState(invoice?.vendor || '')
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoiceNumber || '')
  const [description, setDescription] = useState(invoice?.description || '')
  const [category, setCategory] = useState(invoice?.category || '')
  const [amount, setAmount] = useState(invoice?.amount || '')
  const [recordingDate, setRecordingDate] = useState(formatDateForInput(invoice?.recordingDate) || formatDateForInput(new Date()))
  const [dueDate, setDueDate] = useState(formatDateForInput(invoice?.dueDate) || '')
  const [status, setStatus] = useState(invoice?.status || 'PENDING')
  const [paymentMethod, setPaymentMethod] = useState(invoice?.paymentMethod || '')
  const [paidDate, setPaidDate] = useState(formatDateForInput(invoice?.paidDate) || '')
  const [notes, setNotes] = useState(invoice?.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const showPaymentFields = status === 'PAID'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!vendor.trim()) { setError('Vendor is required'); return }
    if (!amount || Number(amount) <= 0) { setError('Amount must be greater than 0'); return }
    if (!dueDate) { setError('Due date is required'); return }

    setSaving(true)
    try {
      await onSave({
        company,
        vendor: vendor.trim(),
        invoiceNumber: invoiceNumber.trim(),
        description: description.trim(),
        category: category || null,
        amount: Number(amount),
        recordingDate,
        dueDate,
        paidDate: showPaymentFields && paidDate ? paidDate : null,
        status,
        paymentMethod: showPaymentFields ? paymentMethod : null,
        notes: notes.trim() || null,
      })
    } catch (err) {
      setError(err.message || 'Failed to save')
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-800 text-slate-200 placeholder:text-slate-500'
  const labelClass = 'block text-sm font-medium text-slate-400 mb-1'
  const selectClass = inputClass

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-semibold text-slate-200 mb-4">
          {isEdit ? 'Edit Invoice' : 'Add Invoice'}
        </h2>

        {error && <p className="text-sm text-rose-400 mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Company + Vendor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Company *</label>
              <select value={company} onChange={(e) => setCompany(e.target.value)} className={selectClass} required>
                {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Vendor *</label>
              <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} className={inputClass} placeholder="Who are you paying?" required />
            </div>
          </div>

          {/* Row 2: Invoice # + Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Invoice Number</label>
              <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className={inputClass} placeholder="INV-001" />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
                <option value="">Select category...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description *</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} placeholder="What is this invoice for?" required />
          </div>

          {/* Row 3: Amount + Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Amount (USD) *</label>
              <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} placeholder="0.00" required />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
          </div>

          {/* Row 4: Recording Date + Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Recording Date *</label>
              <input type="date" value={recordingDate} onChange={(e) => setRecordingDate(e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Due Date *</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} required />
            </div>
          </div>

          {/* Payment fields (shown only when PAID) */}
          {showPaymentFields && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={selectClass}>
                  <option value="">Select method...</option>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Paid Date</label>
                <input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} className={inputClass} />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass + ' h-20 resize-none'} placeholder="Additional notes..." />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 bg-slate-800 border border-slate-600 rounded-md hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-slate-950 bg-emerald-500 rounded-md hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Update Invoice' : 'Add Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
