import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { fetchCashflowFromSupabase } from './cashflowData'
import { fetchNetIncomeFromSupabase } from './netIncomeData'
import { fetchAPInvoices, fetchAPForCashflow } from './apData'

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const DataCacheContext = createContext(null)

export function DataCacheProvider({ children }) {
  const cache = useRef({})

  const getCached = useCallback((key) => {
    const entry = cache.current[key]
    if (!entry) return null
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      delete cache.current[key]
      return null
    }
    return entry.data
  }, [])

  const setCached = useCallback((key, data) => {
    cache.current[key] = { data, timestamp: Date.now() }
  }, [])

  const invalidate = useCallback((key) => {
    if (key) {
      delete cache.current[key]
    } else {
      cache.current = {}
    }
  }, [])

  const fetchCashflow = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCached('cashflow')
      if (cached) return cached
    }
    const data = await fetchCashflowFromSupabase()
    if (data !== null) setCached('cashflow', data)
    return data
  }, [getCached, setCached])

  const fetchNetIncome = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCached('netIncome')
      if (cached) return cached
    }
    const data = await fetchNetIncomeFromSupabase()
    if (data !== null) setCached('netIncome', data)
    return data
  }, [getCached, setCached])

  const fetchAP = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCached('ap')
      if (cached) return cached
    }
    const data = await fetchAPInvoices()
    if (data !== null) setCached('ap', data)
    return data
  }, [getCached, setCached])

  const fetchAPCashflow = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCached('apCashflow')
      if (cached) return cached
    }
    const data = await fetchAPForCashflow()
    if (data) setCached('apCashflow', data)
    return data
  }, [getCached, setCached])

  return (
    <DataCacheContext.Provider value={{ fetchCashflow, fetchNetIncome, fetchAP, fetchAPCashflow, invalidate }}>
      {children}
    </DataCacheContext.Provider>
  )
}

export function useDataCache() {
  const ctx = useContext(DataCacheContext)
  if (!ctx) throw new Error('useDataCache must be used within DataCacheProvider')
  return ctx
}
