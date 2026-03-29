import { useEffect, useState } from 'react'
import { Plus, Tag, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../lib/api'
import type { Category } from '../types'
import { useForm } from 'react-hook-form'

interface CategoryForm {
  name: string
  type: 'income' | 'expense'
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CategoryForm>({ defaultValues: { type: 'income' } })

  useEffect(() => { load() }, [])

  async function load() {
    try { setCategories(await getCategories()) } finally { setLoading(false) }
  }

  function startEdit(cat: Category) {
    setEditing(cat)
    setValue('name', cat.name)
    setValue('type', cat.type)
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditing(null)
    reset({ type: 'income' })
  }

  async function onSubmit(data: CategoryForm) {
    if (editing) {
      const updated = await updateCategory(editing.id, data)
      setCategories(prev => prev.map(c => c.id === updated.id ? updated : c))
    } else {
      const created = await createCategory(data)
      setCategories(prev => [...prev, created])
    }
    cancelForm()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category? Transactions using it will lose the category link.')) return
    await deleteCategory(id)
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  const incomeCategories = categories.filter(c => c.type === 'income')
  const expenseCategories = categories.filter(c => c.type === 'expense')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 text-sm">Manage income and expense categories</p>
        </div>
        <button
          onClick={() => { cancelForm(); setShowForm(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editing ? 'Edit Category' : 'New Category'}</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                {...register('name', { required: 'Name is required' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Rent, Mortgage, Repairs…"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                {...register('type')}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                {editing ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={cancelForm} className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryGroup
            title="Income Categories"
            icon={<TrendingUp className="w-4 h-4" />}
            color="green"
            categories={incomeCategories}
            onEdit={startEdit}
            onDelete={handleDelete}
          />
          <CategoryGroup
            title="Expense Categories"
            icon={<TrendingDown className="w-4 h-4" />}
            color="red"
            categories={expenseCategories}
            onEdit={startEdit}
            onDelete={handleDelete}
          />
        </div>
      )}
    </div>
  )
}

function CategoryGroup({ title, icon, color, categories, onEdit, onDelete }: {
  title: string
  icon: React.ReactNode
  color: 'green' | 'red'
  categories: Category[]
  onEdit: (c: Category) => void
  onDelete: (id: string) => void
}) {
  const colorClasses = {
    green: { header: 'bg-green-50 text-green-700 border-green-100', badge: 'bg-green-100 text-green-600' },
    red: { header: 'bg-red-50 text-red-700 border-red-100', badge: 'bg-red-100 text-red-600' },
  }
  const c = colorClasses[color]

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className={`flex items-center gap-2 px-5 py-3 border-b ${c.header}`}>
        {icon}
        <h2 className="font-semibold text-sm">{title}</h2>
        <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${c.badge}`}>{categories.length}</span>
      </div>
      {categories.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Tag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No categories yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {categories.map(cat => (
            <li key={cat.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-900">{cat.name}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => onEdit(cat)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onDelete(cat.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
