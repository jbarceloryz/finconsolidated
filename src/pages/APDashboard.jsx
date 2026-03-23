import React, { useState, useEffect, useMemo } from 'react'
import APSummaryCards from '../dashboards/ap/components/APSummaryCards'
import APInvoiceTable from '../dashboards/ap/components/APInvoiceTable'
import APInvoiceForm from '../dashboards/ap/components/APInvoiceForm'
import APCompanyFilter from '../dashboards/ap/components/APCompanyFilter'
import APAgingChart from '../dashboards/ap/components/APAgingChart'
import { fetchAPInvoices, createAPInvoice, updateAPInvoice, deleteAPInvoice } from '../lib/apData'

export default function APDashboard() {
  const [invoices, setInvoices] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [companyFilter, setCompanyFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)

  const loadData = () => {
    setIsLoading(true)
    setLoadError(null)
    fetchAPInvoices()
      .then((data) => {
        if (data !== null) {
          setInvoices(data)
          setLastUpdated(new Date())
        } else {
          setLoadError('Could not load AP data. Check Supabase configuration.')
        }
        setIsLoading(false)
      })
      .catch((err) => {
        console.error('Error loading AP data:', err)
        setIsLoading(false)
        setLoadError(err.message || 'Failed to load data')
      })
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredInvoices = useMemo(() => {
    if (!invoices) return []
    if (companyFilter === 'all') return invoices
    return invoices.filter((inv) => inv.company === companyFilter)
  }, [invoices, companyFilter])

  const handleSave = async (formData) => {
    if (editingInvoice) {
      await updateAPInvoice(editingInvoice.id, formData)
    } else {
      await createAPInvoice(formData)
    }
    setShowForm(false)
    setEditingInvoice(null)
    loadData()
  }

  const handleEdit = (inv) => {
    setEditingInvoice(inv)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    try {
      await deleteAPInvoice(id)
      loadData()
    } catch (err) {
      console.error('Delete failed:', err)
      alert('Failed to delete invoice: ' + err.message)
    }
  }

  const handleMarkPaid = async (inv) => {
    const today = new Date()
    const paidDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    try {
      await updateAPInvoice(inv.id, { status: 'PAID', paidDate, paymentMethod: null })
      loadData()
    } catch (err) {
      console.error('Mark paid failed:', err)
      alert('Failed to mark as paid: ' + err.message)
    }
  }

  // Error state
  if (loadError) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[40vh]">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{loadError}</p>
          <p className="text-slate-500 text-sm mb-4">
            Check <code className="bg-slate-800 px-1 rounded">.env</code> (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) and the <code className="bg-slate-800 px-1 rounded">accounts_payable</code> table.
          </p>
          <button type="button" onClick={loadData} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-500 disabled:opacity-50">
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Loading skeleton
  if (invoices === null) {
    return (
      <div className="min-h-full bg-slate-950 p-8 font-sans">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="animate-pulse bg-slate-800 rounded-lg h-12 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="animate-pulse bg-slate-800 rounded-lg h-24" />)}
          </div>
          <div className="animate-pulse bg-slate-800 rounded-lg h-64" />
          <div className="animate-pulse bg-slate-800 rounded-lg h-48" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-950 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Toolbar */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <APCompanyFilter value={companyFilter} onChange={setCompanyFilter} />
              {lastUpdated && (
                <span className="text-slate-500 text-xs">Last updated: {lastUpdated.toLocaleTimeString()}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditingInvoice(null); setShowForm(true) }}
                className="px-4 py-2 text-sm font-semibold text-slate-950 bg-emerald-500 rounded-md hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950 transition-colors"
              >
                + Add Invoice
              </button>
              <button
                onClick={loadData}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-emerald-400 bg-slate-800 border border-slate-600 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="space-y-4">
          <APSummaryCards invoices={filteredInvoices} />
          <APAgingChart invoices={filteredInvoices} />
          <APInvoiceTable
            invoices={filteredInvoices}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onMarkPaid={handleMarkPaid}
          />
        </div>

        {/* Invoice form modal */}
        {showForm && (
          <APInvoiceForm
            invoice={editingInvoice}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditingInvoice(null) }}
          />
        )}
      </div>
    </div>
  )
}
