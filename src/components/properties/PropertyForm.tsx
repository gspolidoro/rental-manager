import { useForm } from 'react-hook-form'
import type { Property } from '../../types'

type FormData = Omit<Property, 'id' | 'user_id' | 'created_at' | 'updated_at'>

interface Props {
  initial?: Property
  onSave: (data: FormData) => Promise<void>
  onCancel: () => void
}

export default function PropertyForm({ initial, onSave, onCancel }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: initial ? {
      name: initial.name,
      address: initial.address ?? '',
      description: initial.description ?? '',
      purchase_price: initial.purchase_price ?? undefined,
    } : { name: '', address: '', description: '' },
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-5">{initial ? 'Edit Property' : 'New Property'}</h2>
      <form onSubmit={handleSubmit(onSave)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Name *</label>
            <input
              {...register('name', { required: 'Name is required' })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Main St Apartment"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              {...register('address')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123 Main St, City, State"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            {...register('description')}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Optional notes about this property…"
          />
        </div>
        <div className="sm:w-1/2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('purchase_price', { valueAsNumber: true })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {isSubmitting ? 'Saving…' : initial ? 'Update Property' : 'Create Property'}
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
