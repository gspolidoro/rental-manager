import * as XLSX from 'xlsx'
import type { Property, Transaction } from '../types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmt(n: number) {
  return Math.round(n * 100) / 100
}

function getMonthTotals(transactions: Transaction[]) {
  // Returns [{ income, expense }] indexed by month 0-11
  const months = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }))
  for (const t of transactions) {
    const m = new Date(t.date + 'T00:00:00').getMonth()
    if (t.type === 'income') months[m].income += Number(t.amount)
    else months[m].expense += Number(t.amount)
  }
  return months
}

// ─── Sheet 1: Annual Summary ────────────────────────────────────────────────
function buildAnnualSummary(
  wb: XLSX.WorkBook,
  year: number,
  properties: Property[],
  txByProperty: Map<string, Transaction[]>,
) {
  const rows: (string | number)[][] = []

  rows.push([`Annual Summary — ${year}`])
  rows.push([])
  rows.push(['Property', 'Total Income', 'Total Expenses', 'Net Income'])

  let grandIncome = 0
  let grandExpense = 0

  for (const p of properties) {
    const txs = txByProperty.get(p.id) ?? []
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    grandIncome += income
    grandExpense += expense
    rows.push([p.name, fmt(income), fmt(expense), fmt(income - expense)])
  }

  rows.push([])
  rows.push(['TOTAL', fmt(grandIncome), fmt(grandExpense), fmt(grandIncome - grandExpense)])

  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Column widths
  ws['!cols'] = [{ wch: 32 }, { wch: 16 }, { wch: 16 }, { wch: 16 }]

  XLSX.utils.book_append_sheet(wb, ws, 'Annual Summary')
}

// ─── Sheet 2: Monthly Income by Property ────────────────────────────────────
function buildMonthlySheet(
  wb: XLSX.WorkBook,
  year: number,
  label: string,
  sheetName: string,
  type: 'income' | 'expense' | 'net',
  properties: Property[],
  txByProperty: Map<string, Transaction[]>,
) {
  const rows: (string | number)[][] = []
  rows.push([`${label} — ${year}`])
  rows.push([])
  rows.push(['Property', ...MONTHS, 'Total'])

  let grandMonths = Array(12).fill(0)
  let grandTotal = 0

  for (const p of properties) {
    const txs = txByProperty.get(p.id) ?? []
    const monthTotals = getMonthTotals(txs)
    const values = monthTotals.map(m => {
      if (type === 'income') return fmt(m.income)
      if (type === 'expense') return fmt(m.expense)
      return fmt(m.income - m.expense)
    })
    const total = values.reduce((a, b) => a + b, 0)
    values.forEach((v, i) => { grandMonths[i] += v })
    grandTotal += total
    rows.push([p.name, ...values, fmt(total)])
  }

  rows.push([])
  rows.push(['TOTAL', ...grandMonths.map(fmt), fmt(grandTotal)])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 32 }, ...Array(12).fill({ wch: 10 }), { wch: 12 }]

  XLSX.utils.book_append_sheet(wb, ws, sheetName)
}

// ─── Sheet per Property: Monthly Income & Expenses by Category ──────────────
function buildPropertySheet(
  wb: XLSX.WorkBook,
  year: number,
  property: Property,
  transactions: Transaction[],
) {
  const rows: (string | number | null)[][] = []
  rows.push([`${property.name} — ${year}`])
  if (property.address) rows.push([property.address])
  rows.push([])

  // Group categories
  const incomeCategories = new Map<string, number[]>() // category → [month0..11]
  const expenseCategories = new Map<string, number[]>()

  for (const t of transactions) {
    const m = new Date(t.date + 'T00:00:00').getMonth()
    const catName = t.category?.name ?? 'Uncategorized'
    const map = t.type === 'income' ? incomeCategories : expenseCategories
    if (!map.has(catName)) map.set(catName, Array(12).fill(0))
    map.get(catName)![m] += Number(t.amount)
  }

  // Header row
  rows.push(['', ...MONTHS, 'Total'])

  const addSection = (
    title: string,
    catMap: Map<string, number[]>,
  ) => {
    rows.push([title])
    let sectionTotals = Array(12).fill(0)
    let sectionTotal = 0

    const sorted = Array.from(catMap.entries()).sort(([a], [b]) => a.localeCompare(b))
    for (const [cat, monthly] of sorted) {
      const total = monthly.reduce((a, b) => a + b, 0)
      rows.push([`  ${cat}`, ...monthly.map(fmt), fmt(total)])
      monthly.forEach((v, i) => { sectionTotals[i] += v })
      sectionTotal += total
    }
    rows.push([`${title} Total`, ...sectionTotals.map(fmt), fmt(sectionTotal)])
    rows.push([])
    return sectionTotals
  }

  const incomeTotals = addSection('INCOME', incomeCategories)
  const expenseTotals = addSection('EXPENSES', expenseCategories)

  const netMonths = incomeTotals.map((inc, i) => fmt(inc - expenseTotals[i]))
  const netTotal = netMonths.reduce((a, b) => a + b, 0)
  rows.push(['NET INCOME', ...netMonths, fmt(netTotal)])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 28 }, ...Array(12).fill({ wch: 10 }), { wch: 12 }]

  // Sanitize sheet name (Excel limit: 31 chars, no special chars)
  const safeName = property.name.replace(/[:\\/?*[\]]/g, '').substring(0, 31)
  XLSX.utils.book_append_sheet(wb, ws, safeName)
}

// ─── Main Export Function ────────────────────────────────────────────────────
export function exportPropertyReport(
  year: number,
  properties: Property[],
  transactions: Transaction[],
) {
  const yearTx = transactions.filter(t => {
    return new Date(t.date + 'T00:00:00').getFullYear() === year
  })

  // Group transactions by property
  const txByProperty = new Map<string, Transaction[]>()
  for (const p of properties) txByProperty.set(p.id, [])
  for (const t of yearTx) {
    if (!txByProperty.has(t.property_id)) txByProperty.set(t.property_id, [])
    txByProperty.get(t.property_id)!.push(t)
  }

  const wb = XLSX.utils.book_new()

  buildAnnualSummary(wb, year, properties, txByProperty)
  buildMonthlySheet(wb, year, 'Monthly Income', 'Monthly Income', 'income', properties, txByProperty)
  buildMonthlySheet(wb, year, 'Monthly Expenses', 'Monthly Expenses', 'expense', properties, txByProperty)
  buildMonthlySheet(wb, year, 'Monthly Net Income', 'Monthly Net', 'net', properties, txByProperty)

  for (const p of properties) {
    const txs = txByProperty.get(p.id) ?? []
    buildPropertySheet(wb, year, p, txs)
  }

  XLSX.writeFile(wb, `rental-report-${year}.xlsx`)
}

// ─── Helper: build report data for UI preview ────────────────────────────────
export interface PropertySummary {
  property: Property
  monthlyIncome: number[]
  monthlyExpense: number[]
  totalIncome: number
  totalExpense: number
  netIncome: number
}

export function buildReportData(
  year: number,
  properties: Property[],
  transactions: Transaction[],
): PropertySummary[] {
  const yearTx = transactions.filter(
    t => new Date(t.date + 'T00:00:00').getFullYear() === year
  )

  return properties.map(p => {
    const txs = yearTx.filter(t => t.property_id === p.id)
    const monthly = getMonthTotals(txs)
    const totalIncome = monthly.reduce((s, m) => s + m.income, 0)
    const totalExpense = monthly.reduce((s, m) => s + m.expense, 0)
    return {
      property: p,
      monthlyIncome: monthly.map(m => fmt(m.income)),
      monthlyExpense: monthly.map(m => fmt(m.expense)),
      totalIncome: fmt(totalIncome),
      totalExpense: fmt(totalExpense),
      netIncome: fmt(totalIncome - totalExpense),
    }
  })
}

export { MONTHS }
