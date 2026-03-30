import { useForm } from 'react-hook-form'
import { useRef, useState } from 'react'
import { ImagePlus, X, Loader2, FileText } from 'lucide-react'
import type { Transaction, Category } from '../../types'
import { format } from 'date-fns'
import { getReceiptUrl } from '../../lib/api'

type FormData = {
  type: 'income' | 'expense'
  amount: number
  date: string
  category_id: string
  description: string
  property_id: string
}

export type TransactionPayload = Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'category' | 'property'> & {
  _receiptFile?: File
  _removeReceipt?: boolean
}

interface Props {
  initial?: Transaction
  categories: Category[]
  propertyId: string
  onSave: (data: TransactionPayload) => Promise<void>
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

  // Receipt state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [existingPath, setExistingPath] = useState<string | null>(initial?.receipt_url ?? null)
  const [removeExisting, setRemoveExisting] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const selectedType = watch('type')
  const filteredCategories = categories.filter(c => c.type === selectedType)

  function handleFileChange(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('Please select an image (JPEG, PNG, WebP) or PDF file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File must be under 10 MB.')
      return
    }
    setReceiptFile(file)
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null)
    }
  }

  function clearReceipt() {
    setReceiptFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFileChange(e.dataTransfer.files[0] ?? null)
  }

  async function onSubmit(data: FormData) {
    await onSave({
      type: data.type,
      amount: Number(data.amount),
      date: data.date,
      category_id: data.category_id || null,
      description: data.description || null,
      property_id: data.property_id,
      receipt_url: removeExisting ? null : existingPath,
      _receiptFile: receiptFile ?? undefined,
      _removeReceipt: removeExisting,
    })
  }

  const showExisting = existingPath && !removeExisting && !receiptFile

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-5">
        {initial ? 'Edit Transaction' : 'New Transaction'}
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Type */}
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

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
            <input
              type="number" step="0.01" min="0.01"
              {...register('amount', {
                required: 'Amount is required',
                min: { value: 0.01, message: 'Must be > 0' },
                valueAsNumber: true,
              })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input
              type="date"
              {...register('date', { required: 'Date is required' })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
          </div>

          {/* Category */}
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

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              {...register('description')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional note…"
            />
          </div>
        </div>

        {/* ── Receipt Upload ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Receipt / Attachment
          </label>

          {/* Existing receipt (edit mode) */}
          {showExisting && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg mb-2">
              <ExistingPreview path={existingPath} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700">Receipt attached</p>
                <p className="text-xs text-gray-400 truncate">{existingPath.split('/').pop()}</p>
              </div>
              <button
                type="button"
                onClick={() => { setRemoveExisting(true); setExistingPath(null) }}
                className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                title="Remove receipt"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* New file selected */}
          {receiptFile && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              {previewUrl ? (
                <img src={previewUrl} alt="preview" className="w-14 h-14 object-cover rounded border border-blue-200 flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{receiptFile.name}</p>
                <p className="text-xs text-gray-500">{(receiptFile.size / 1024).toFixed(0)} KB</p>
              </div>
              <button type="button" onClick={clearReceipt} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Drop zone — only shown when no file selected and no existing */}
          {!showExisting && !receiptFile && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors select-none ${
                dragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              <ImagePlus className="w-7 h-7 text-gray-400" />
              <p className="text-sm text-gray-500">
                <span className="text-blue-600 font-medium">Click to upload</span> or drag &amp; drop
              </p>
              <p className="text-xs text-gray-400">JPEG, PNG, WebP or PDF — max 10 MB</p>
            </div>
          )}

          {/* Replace button when existing is shown */}
          {showExisting && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              Replace with a different file
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            className="hidden"
            onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
          />
        </div>

        <input type="hidden" {...register('property_id')} />

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
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

// Tiny thumbnail for the existing saved receipt
function ExistingPreview({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useState(() => {
    getReceiptUrl(path).then(setUrl).catch(() => null)
  })

  const isPdf = path.toLowerCase().endsWith('.pdf')

  if (isPdf) {
    return (
      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
        <FileText className="w-5 h-5 text-gray-500" />
      </div>
    )
  }

  return url ? (
    <img src={url} alt="receipt" className="w-10 h-10 object-cover rounded border border-gray-200 flex-shrink-0" />
  ) : (
    <div className="w-10 h-10 bg-gray-100 rounded flex-shrink-0 animate-pulse" />
  )
}
