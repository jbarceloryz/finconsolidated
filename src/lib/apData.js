import { supabase, isSupabaseConfigured } from './supabase'

/**
 * Fetch all AP invoices, optionally filtered by company and/or status.
 */
export async function fetchAPInvoices(filters = {}) {
  if (!isSupabaseConfigured()) return null

  let query = supabase
    .from('accounts_payable')
    .select('*')
    .order('due_date', { ascending: true })

  if (filters.company && filters.company !== 'all') {
    query = query.eq('company', filters.company)
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Supabase accounts_payable fetch error:', error)
    return null
  }

  if (!data || !data.length) return []

  return data.map((row) => {
    // Parse dates explicitly to avoid UTC timezone shift
    const parseDate = (d) => {
      if (!d) return null
      const [y, m, day] = d.split('-')
      return new Date(Number(y), Number(m) - 1, Number(day))
    }

    return {
      id: row.id,
      company: row.company,
      vendor: row.vendor || '',
      invoiceNumber: row.invoice_number || '',
      description: row.description || '',
      category: row.category || '',
      amount: Number(row.amount) || 0,
      recordingDate: parseDate(row.recording_date),
      dueDate: parseDate(row.due_date),
      paidDate: parseDate(row.paid_date),
      status: row.status || 'PENDING',
      paymentMethod: row.payment_method || '',
      notes: row.notes || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  })
}

/**
 * Create a new AP invoice.
 */
export async function createAPInvoice(invoice) {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')

  const { data, error } = await supabase
    .from('accounts_payable')
    .insert([{
      company: invoice.company,
      vendor: invoice.vendor,
      invoice_number: invoice.invoiceNumber || null,
      description: invoice.description || null,
      category: invoice.category || null,
      amount: invoice.amount,
      recording_date: invoice.recordingDate,
      due_date: invoice.dueDate,
      paid_date: invoice.paidDate || null,
      status: invoice.status || 'PENDING',
      payment_method: invoice.paymentMethod || null,
      notes: invoice.notes || null,
    }])
    .select()

  if (error) {
    console.error('Supabase AP insert error:', error)
    throw new Error(error.message)
  }
  return data?.[0]
}

/**
 * Update an existing AP invoice.
 */
export async function updateAPInvoice(id, updates) {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')

  const payload = {}
  if (updates.company !== undefined) payload.company = updates.company
  if (updates.vendor !== undefined) payload.vendor = updates.vendor
  if (updates.invoiceNumber !== undefined) payload.invoice_number = updates.invoiceNumber
  if (updates.description !== undefined) payload.description = updates.description
  if (updates.category !== undefined) payload.category = updates.category
  if (updates.amount !== undefined) payload.amount = updates.amount
  if (updates.recordingDate !== undefined) payload.recording_date = updates.recordingDate
  if (updates.dueDate !== undefined) payload.due_date = updates.dueDate
  if (updates.paidDate !== undefined) payload.paid_date = updates.paidDate
  if (updates.status !== undefined) payload.status = updates.status
  if (updates.paymentMethod !== undefined) payload.payment_method = updates.paymentMethod
  if (updates.notes !== undefined) payload.notes = updates.notes

  const { data, error } = await supabase
    .from('accounts_payable')
    .update(payload)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Supabase AP update error:', error)
    throw new Error(error.message)
  }
  return data?.[0]
}

/**
 * Delete an AP invoice.
 */
export async function deleteAPInvoice(id) {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')

  const { error } = await supabase
    .from('accounts_payable')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Supabase AP delete error:', error)
    throw new Error(error.message)
  }
}
