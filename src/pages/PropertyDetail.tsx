import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, TrendingUp, TrendingDown, DollarSign, Pencil, Trash2, Paperclip } from 'lucide-react'
import {
  getProperty, getTransactions, getCategories,
  createTransaction, updateTransaction, deleteTransaction,
  uploadReceipt, deleteReceipt,
} from '../lib/api'
import type { Property, Transaction, Category } from '../types'
import TransactionForm, { type TransactionPayload } from '../components/transactions/TransactionForm'
import ReceiptModal from '../components/transactions/ReceiptModal'
import { format } from 'date-fns'

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>()
  const [property, setProperty] = useState<Property | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [viewReceiptPath, setViewReceiptPath] = useState<string | null>(null)

  useEffect(() => {
    if (id) load(id)
  }, [id])

  async function load(propId: string) {
    setLoading(true)
    try {
      const [prop, txns, cats] = await Promise.all([
        getProperty(propId),
        getTransactions(propId),
        getCategories(),
      ])
      setProperty(prop)
      setTransactions(txns)
      setCategories(cats)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(payload: TransactionPayload) {
    const { _receiptFile, _removeReceipt, ...data } = payload as TransactionPayload & {
      _receiptFile?: File
      _removeReceipt?: boolean
    }

    if (editing) {
      let receiptUrl = data.receipt_url

      if (_removeReceipt && editing.receipt_url) {
        await deleteReceipt(editing.receipt_url).catch(() => null)
        receiptUrl = null
      }
      if (_receiptFile) {
        receiptUrl = await uploadReceipt(editing.id, _receiptFile)
      }

      const updated = await updateTransaction(editing.id, { ...data, receipt_url: receiptUrl })
      setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t))
    } else {
      const created = await createTransaction({ ...data, receipt_url: null })

      if (_receiptFile) {
        const receiptUrl = await uploadReceipt(created.id, _receiptFile)
        const withReceipt = await updateTransaction(created.id, { receipt_url: receiptUrl })
        setTransactions(prev => [withReceipt, ...prev])
      } else {
        setTransactions(prev => [created, ...prev])
      }
    }

    setShowForm(false)
    setEditing(null)
  }

  async function handleDelete(txn: Transaction) {
    if (!confirm('Delete this transaction?')) return
    if (txn.receipt_url) {
      await deleteReceipt(txn.receipt_url).catch(() => null)
    }
    await deleteTransaction(txn.id)
    setTransactions(prev => prev.filter(t => t.id !== txn.id))
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Loading…</div>
  if (!property) return <div className="text-center py-16 text-gray-400">Property not found.</div>

  const fmtUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const filtered = filterType === 'all' ? transactions : transactions.filter(t => t.type === filterType)

  return (
    <div className="space-y-6">
      <div>
        <Link to="/properties" className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to Properties
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
        {property.address && <p className="text-gray-500 text-sm">{property.address}</p>}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-xs text-green-600 font-medium">Income</p>
          <p className="text-lg font-bold text-green-700">{fmtUSD(totalIncome)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
          <TrendingDown className="w-5 h-5 text-red-600 mx-auto mb-1" />
          <p className="text-xs text-red-600 font-medium">Expenses</p>
          <p className="text-lg font-bold text-red-700">{fmtUSD(totalExpenses)}</p>
        </div>
        <div className={`border rounded-xl p-4 text-center ${totalIncome - totalExpenses >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
          <DollarSign className={`w-5 h-5 mx-auto mb-1 ${totalIncome - totalExpenses >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
          <p className={`text-xs font-medium ${totalIncome - totalExpenses >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Net</p>
          <p className={`text-lg font-bold ${totalIncome - totalExpenses >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{fmtUSD(totalIncome - totalExpenses)}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'income', 'expense'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${filterType === type ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {type}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Transaction
        </button>
      </div>

      {(showForm || editing) && (
        <TransactionForm
          initial={editing ?? undefined}
          categories={categories}
          propertyId={id!}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            No transactions found. Add your first one above.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">Description</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">Category</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">Type</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">Amount</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wide px-3 py-3">Receipt</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {format(new Date(t.date + 'T00:00:00'), 'MMM d, yyyy')}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-900 max-w-[200px] truncate">
                    {t.description || '—'}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{t.category?.name || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.type === 'income' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {t.type}
                    </span>
                  </td>
                  <td className={`px-5 py-3 text-sm font-semibold text-right ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{fmtUSD(Number(t.amount))}
                  </td>
                  {/* Receipt icon */}
                  <td className="px-3 py-3 text-center">
                    {t.receipt_url ? (
                      <button
                        onClick={() => setViewReceiptPath(t.receipt_url)}
                        title="View receipt"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-500 hover:text-blue-700 transition-colors"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-gray-200 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => { setEditing(t); setShowForm(false) }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Receipt lightbox modal */}
      {viewReceiptPath && (
        <ReceiptModal
          receiptPath={viewReceiptPath}
          onClose={() => setViewReceiptPath(null)}
        />
      )}
    </div>
  )
}
