import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, TrendingUp, TrendingDown, DollarSign, ArrowRight } from 'lucide-react'
import { getProperties, getTransactions } from '../lib/api'
import type { Property, Transaction } from '../types'
import { format } from 'date-fns'

interface Summary {
  totalProperties: number
  totalIncome: number
  totalExpenses: number
  netIncome: number
}

export default function Dashboard() {
  const [properties, setProperties] = useState<Property[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<Summary>({ totalProperties: 0, totalIncome: 0, totalExpenses: 0, netIncome: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [props, txns] = await Promise.all([getProperties(), getTransactions()])
      setProperties(props)
      setRecentTransactions(txns.slice(0, 8))
      const totalIncome = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const totalExpenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      setSummary({ totalProperties: props.length, totalIncome, totalExpenses, netIncome: totalIncome - totalExpenses })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">Overview of your rental portfolio</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          label="Properties"
          value={summary.totalProperties.toString()}
          icon={<Building2 className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          label="Total Income"
          value={fmt(summary.totalIncome)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          label="Total Expenses"
          value={fmt(summary.totalExpenses)}
          icon={<TrendingDown className="w-5 h-5" />}
          color="red"
        />
        <StatCard
          label="Net Income"
          value={fmt(summary.netIncome)}
          icon={<DollarSign className="w-5 h-5" />}
          color={summary.netIncome >= 0 ? 'green' : 'red'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Properties */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Properties</h2>
            <Link to="/properties" className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {properties.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No properties yet. <Link to="/properties" className="text-blue-600">Add one</Link>.</p>
          ) : (
            <div className="space-y-3">
              {properties.slice(0, 5).map(p => (
                <Link key={p.id} to={`/properties/${p.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="bg-blue-100 text-blue-600 rounded-lg p-2">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{p.name}</p>
                    {p.address && <p className="text-gray-400 text-xs truncate">{p.address}</p>}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Transactions</h2>
          {recentTransactions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No transactions yet.</p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map(t => (
                <div key={t.id} className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {t.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{t.description || t.category?.name || 'Transaction'}</p>
                    <p className="text-xs text-gray-400">{t.property?.name} · {format(new Date(t.date), 'MMM d, yyyy')}</p>
                  </div>
                  <span className={`text-sm font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: 'blue' | 'green' | 'red' }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`rounded-xl p-3 ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  )
}
