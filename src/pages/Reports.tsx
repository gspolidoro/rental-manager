import { useState, useEffect, useMemo } from 'react'
import { Download, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react'
import { getProperties } from '../lib/api'
import { getTransactions } from '../lib/api'
import { exportPropertyReport, buildReportData, MONTHS } from '../lib/export'
import type { Property, Transaction } from '../types'

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function cls(...v: (string | false | undefined)[]) {
  return v.filter(Boolean).join(' ')
}

export default function Reports() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [properties, setProperties] = useState<Property[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Year options: current year ± 5
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).reverse()

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [props, txs] = await Promise.all([getProperties(), getTransactions()])
        setProperties(props)
        setTransactions(txs)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const reportData = useMemo(
    () => buildReportData(year, properties, transactions),
    [year, properties, transactions],
  )

  const grandIncome = reportData.reduce((s, r) => s + r.totalIncome, 0)
  const grandExpense = reportData.reduce((s, r) => s + r.totalExpense, 0)
  const grandNet = grandIncome - grandExpense

  async function handleExport() {
    setExporting(true)
    try {
      exportPropertyReport(year, properties, transactions)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading report data…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Income &amp; expense summary per property — monthly and yearly
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Year selector */}
          <div className="relative">
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={exporting || properties.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? (
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export to Excel
          </button>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No properties found. Add a property first.</p>
        </div>
      ) : (
        <>
          {/* Annual Summary Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-800">
                Annual Summary — {year}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 font-medium text-gray-500 w-64">Property</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Total Income</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Total Expenses</th>
                    <th className="text-right px-6 py-3 font-medium text-gray-500">Net Income</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map(row => (
                    <tr key={row.property.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{row.property.name}</td>
                      <td className="px-4 py-3 text-right text-green-700">{USD.format(row.totalIncome)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{USD.format(row.totalExpense)}</td>
                      <td className={cls(
                        'px-6 py-3 text-right font-semibold',
                        row.netIncome >= 0 ? 'text-green-700' : 'text-red-600',
                      )}>
                        {USD.format(row.netIncome)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="px-6 py-3 font-bold text-gray-900">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-green-700">{USD.format(grandIncome)}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">{USD.format(grandExpense)}</td>
                    <td className={cls(
                      'px-6 py-3 text-right font-bold',
                      grandNet >= 0 ? 'text-green-700' : 'text-red-600',
                    )}>
                      {USD.format(grandNet)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Monthly Breakdown per Property */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-800">
                Monthly Net Income by Property — {year}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 font-medium text-gray-500 sticky left-0 bg-white min-w-[160px]">
                      Property
                    </th>
                    {MONTHS.map(m => (
                      <th key={m} className="text-right px-2 py-3 font-medium text-gray-500 min-w-[72px]">{m}</th>
                    ))}
                    <th className="text-right px-4 py-3 font-medium text-gray-500 min-w-[88px]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map(row => {
                    const nets = row.monthlyIncome.map((inc, i) => inc - row.monthlyExpense[i])
                    return (
                      <tr key={row.property.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900 sticky left-0 bg-inherit">
                          {row.property.name}
                        </td>
                        {nets.map((net, i) => (
                          <td key={i} className={cls(
                            'px-2 py-3 text-right tabular-nums',
                            net === 0 ? 'text-gray-300' : net > 0 ? 'text-green-700' : 'text-red-600',
                          )}>
                            {net === 0 ? '—' : USD.format(net)}
                          </td>
                        ))}
                        <td className={cls(
                          'px-4 py-3 text-right font-semibold tabular-nums',
                          row.netIncome >= 0 ? 'text-green-700' : 'text-red-600',
                        )}>
                          {USD.format(row.netIncome)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-property monthly income vs expense detail */}
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Property Detail — {year}</h2>
            {reportData.map(row => (
              <div key={row.property.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === row.property.id ? null : row.property.id)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-gray-900">{row.property.name}</span>
                    <span className="text-xs text-gray-400">{row.property.address}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-green-700">{USD.format(row.totalIncome)} income</span>
                    <span className="text-red-600">{USD.format(row.totalExpense)} expenses</span>
                    <span className={cls(
                      'font-semibold',
                      row.netIncome >= 0 ? 'text-green-700' : 'text-red-600',
                    )}>
                      {USD.format(row.netIncome)} net
                    </span>
                    {expanded === row.property.id
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                </button>

                {expanded === row.property.id && (
                  <div className="border-t border-gray-100 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left px-6 py-2 font-medium text-gray-500 min-w-[140px]"></th>
                          {MONTHS.map(m => (
                            <th key={m} className="text-right px-2 py-2 font-medium text-gray-500 min-w-[72px]">{m}</th>
                          ))}
                          <th className="text-right px-4 py-2 font-medium text-gray-500 min-w-[88px]">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-green-50">
                          <td className="px-6 py-2 font-semibold text-green-800">Income</td>
                          {row.monthlyIncome.map((v, i) => (
                            <td key={i} className="px-2 py-2 text-right text-green-700 tabular-nums">
                              {v === 0 ? '—' : USD.format(v)}
                            </td>
                          ))}
                          <td className="px-4 py-2 text-right font-bold text-green-800 tabular-nums">
                            {USD.format(row.totalIncome)}
                          </td>
                        </tr>
                        <tr className="bg-red-50">
                          <td className="px-6 py-2 font-semibold text-red-800">Expenses</td>
                          {row.monthlyExpense.map((v, i) => (
                            <td key={i} className="px-2 py-2 text-right text-red-600 tabular-nums">
                              {v === 0 ? '—' : USD.format(v)}
                            </td>
                          ))}
                          <td className="px-4 py-2 text-right font-bold text-red-800 tabular-nums">
                            {USD.format(row.totalExpense)}
                          </td>
                        </tr>
                        <tr className="border-t border-gray-200">
                          <td className="px-6 py-2 font-semibold text-gray-800">Net</td>
                          {row.monthlyIncome.map((inc, i) => {
                            const net = inc - row.monthlyExpense[i]
                            return (
                              <td key={i} className={cls(
                                'px-2 py-2 text-right font-medium tabular-nums',
                                net === 0 ? 'text-gray-300' : net > 0 ? 'text-green-700' : 'text-red-600',
                              )}>
                                {net === 0 ? '—' : USD.format(net)}
                              </td>
                            )
                          })}
                          <td className={cls(
                            'px-4 py-2 text-right font-bold tabular-nums',
                            row.netIncome >= 0 ? 'text-green-700' : 'text-red-600',
                          )}>
                            {USD.format(row.netIncome)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
