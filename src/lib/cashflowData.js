import { supabase, isSupabaseConfigured } from './supabase'
import { getStatusCategory, normalizeStatus } from '../dashboards/cashflow/utils/processCSV'

/**
 * Fetches cashflow invoice data. Uses Supabase if configured, otherwise returns null
 * so the caller can fall back to CSV.
 * @returns {Promise<{ client: string, dueDate: Date, amount: number, originalAmount: number, status: string, statusCategory: string }[] | null>}
 */
export async function fetchCashflowFromSupabase() {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase
    .from('cashflow_invoices')
    .select('client, due_date, amount, status')
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Supabase cashflow_invoices error:', error)
    return null
  }

  if (!data || !data.length) return []

  const excludedClients = ['Studio', 'Ntrvsta']
  return data
    .filter((row) => {
      const client = (row.client || '').trim()
      return client && !excludedClients.some((ex) => client.toLowerCase().includes(ex.toLowerCase()))
    })
    .map((row) => {
      const amount = Number(row.amount) || 0
      const status = normalizeStatus((row.status || '').trim()) || (row.status && row.status.toUpperCase())
      const statusCategory = getStatusCategory(status)
      // Parse as local midnight — new Date('YYYY-MM-DD') is UTC and shifts the date back one day in US timezones
      const dueDate = row.due_date ? new Date(row.due_date + 'T00:00:00') : null
      if (!dueDate || isNaN(dueDate.getTime())) return null
      return {
        client: (row.client || '').trim(),
        dueDate,
        amount: Math.abs(amount),
        originalAmount: amount,
        status,
        statusCategory,
      }
    })
    .filter(Boolean)
}
