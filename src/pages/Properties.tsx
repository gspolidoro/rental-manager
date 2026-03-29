import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Building2, MapPin, ArrowRight, Pencil, Trash2 } from 'lucide-react'
import { getProperties, createProperty, updateProperty, deleteProperty } from '../lib/api'
import type { Property } from '../types'
import PropertyForm from '../components/properties/PropertyForm'

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Property | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setProperties(await getProperties()) } finally { setLoading(false) }
  }

  async function handleSave(data: Omit<Property, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    if (editing) {
      const updated = await updateProperty(editing.id, data)
      setProperties(prev => prev.map(p => p.id === updated.id ? updated : p))
    } else {
      const created = await createProperty(data)
      setProperties(prev => [created, ...prev])
    }
    setShowForm(false)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this property and all its transactions?')) return
    await deleteProperty(id)
    setProperties(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-500 text-sm">{properties.length} property{properties.length !== 1 ? 'ies' : 'y'}</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Property
        </button>
      </div>

      {(showForm || editing) && (
        <PropertyForm
          initial={editing ?? undefined}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : properties.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No properties yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your first rental property to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {properties.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-blue-100 text-blue-600 rounded-lg p-2 flex-shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{p.name}</h3>
                    {p.address && (
                      <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" />{p.address}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => { setEditing(p); setShowForm(false) }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {p.description && <p className="text-gray-500 text-sm line-clamp-2">{p.description}</p>}
              {p.purchase_price != null && (
                <p className="text-gray-400 text-xs">Purchase price: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.purchase_price)}</p>
              )}
              <Link
                to={`/properties/${p.id}`}
                className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium border border-blue-200 hover:border-blue-300 rounded-lg py-2 transition-colors mt-auto"
              >
                View Transactions <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
