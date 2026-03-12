import React, { useState, useEffect } from 'react';
import PaymentTimeline from './components/PaymentTimeline';
import SummaryCards from './components/SummaryCards';
import InvoiceTable from './components/InvoiceTable';
import MonthFilter from './components/MonthFilter';
import CashFlowSimulator from './components/CashFlowSimulator';

const AUTH_KEY = 'cfdash-auth';
const PASSWORD = '!accounting123$';

function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(AUTH_KEY) === '1');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [data, setData] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordError('');
    if (passwordInput === PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, '1');
      setUnlocked(true);
      setPasswordInput('');
    } else {
      setPasswordError('Incorrect password');
    }
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <form onSubmit={handlePasswordSubmit} className="w-full max-w-sm bg-white rounded-lg shadow-sm p-8">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Enter password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            autoFocus
            autoComplete="current-password"
          />
          {passwordError && (
            <p className="mt-2 text-sm text-red-600">{passwordError}</p>
          )}
          <button
            type="submit"
            className="mt-4 w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  const loadCSVData = () => {
    setIsLoading(true);
    setLoadError(null);
    const timestamp = new Date().getTime();
    const r = Math.random().toString(36).slice(2);
    fetch(`/db.csv?t=${timestamp}&r=${r}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load CSV');
        return res.text();
      })
      .then(text => {
        setData(text);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error loading CSV:', err);
        setIsLoading(false);
        setLoadError(err.message || 'Failed to load data');
      });
  };

  useEffect(() => {
    loadCSVData();
  }, []);

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{loadError}</p>
          <button
            type="button"
            onClick={loadCSVData}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Month Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <MonthFilter
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
            />
            <button
              onClick={loadCSVData}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* Main Dashboard */}
        <div className="space-y-4">
          {/* Summary Cards */}
          <SummaryCards 
            csvData={data} 
            currentMonth={selectedMonth}
            currentYear={selectedYear}
          />
          
          {/* Payment Timeline Chart */}
          <PaymentTimeline 
            csvData={data} 
            currentMonth={selectedMonth}
            currentYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
          />
          
          {/* Cash Flow Simulator */}
          <CashFlowSimulator csvData={data} />
          
          {/* Invoice Table */}
          <InvoiceTable 
            csvData={data} 
            currentMonth={selectedMonth}
            currentYear={selectedYear}
          />
        </div>
      </div>
    </div>
  );
}

export default App;

