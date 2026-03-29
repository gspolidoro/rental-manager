import { useForm } from 'react-hook-form'
import type { Transaction, Category } from '../../types'
import { format } from 'date-fns'

type FormData = {
  type: 'income' | 'expense'
  amount: number
  date: string
  category_id: string
  description: string
  property_id: string
}

interface Props {
  initial?: Transaction
  categories: Category[]
  propertyId: string
  onSave: (data: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'category' | 'property'>) => Promise<void>
  onCancel: () => void
}

export default function TransactionForm({ initial, categories, propertyId, onSave, onCancel }: Props) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: initial ? {
      type: initial.type,
      amount: initial.amount,
      date: initial.date,
      category_id: initial.category_id ?? '',
      description: initial.description ?? '',
      property_id: initial.property_id,
    } : {
      type: 'income',
      date: format(new Date(), 'yyyy-MM-dd'),
      property_id: propertyId,
    },
  })

  const selectedType = watch('type')
  const filteredCategories = categories.filter(c => c.type === selectedType)

  async function onSubmit(data: FormData) {
    await onSave({
      type: data.type,
      amount: Number(data.amount),
      date: data.date,
      category_id: data.category_id || null,
      description: data.description || null,
      property_id: data.property_id,
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-5">{initial ? 'Edit Transaction' : 'New Transaction'}</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select
              {...register('type')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              {...register('amount', { required: 'Amount is required', min: { value: 0.01, message: 'Must be > 0' }, valueAsNumber: true })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input
              type="date"
              {...register('date', { required: 'Date is required' })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              {...register('category_id')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— No category —</option>
              {filteredCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              {...register('description')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional note…"
            />
          </div>
        </div>
        <input type="hidden" {...register('property_id')} />
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {isSubmitting ? 'Saving…' : initial ? 'Update Transaction' : 'Add Transaction'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="border border-gray-300 text-gray-700 text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
